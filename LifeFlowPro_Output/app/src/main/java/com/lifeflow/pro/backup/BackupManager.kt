package com.lifeflow.pro.backup

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import com.lifeflow.pro.data.db.AppDatabase
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BackupManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val database: AppDatabase,
) {
    private val dbName = "lifeflow_pro.db"

    // LFPBK1 = legado sem criptografia
    // LFPBK2 = com criptografia AES-256-GCM
    private val headerV1 = "LFPBK1".toByteArray()
    private val headerV2 = "LFPBK2".toByteArray()

    // Passphrase estática do app (nunca exposta ao usuário)
    private val appPassphrase = "LifeFlow_Pro_Secure_Backup_2024"

    // ------------------------------------------------------------------ export

    suspend fun exportBackup(targetUri: Uri): BackupPreview {
        checkpointDatabase()
        val preview = currentPreview(sourceName = DocumentFile.fromSingleUri(context, targetUri)?.name)
        val zipBytes = buildZipPayload(preview)
        val encrypted = encryptAesGcm(zipBytes)          // LFPBK2 + salt + IV + ciphertext

        context.contentResolver.openOutputStream(targetUri, "w")!!.use { it.write(encrypted) }
        return preview
    }

    // ---------------------------------------------------------------- preview

    suspend fun previewBackup(sourceUri: Uri): BackupPreview {
        val raw = context.contentResolver.openInputStream(sourceUri)!!.use { it.readBytes() }
        val entries = decryptAndReadEntries(raw)
        val metadata = entries["metadata.json"]?.decodeToString() ?: error("Backup sem metadados")
        val preview = parseMetadata(metadata, DocumentFile.fromSingleUri(context, sourceUri)?.name)
        validateChecksum(entries, preview.checksum)
        return preview
    }

    // --------------------------------------------------------------- restore

    suspend fun restoreBackup(sourceUri: Uri): BackupPreview {
        val raw = context.contentResolver.openInputStream(sourceUri)!!.use { it.readBytes() }
        val entries = decryptAndReadEntries(raw)
        val metadata = entries["metadata.json"]?.decodeToString() ?: error("Backup sem metadados")
        val preview = parseMetadata(metadata, DocumentFile.fromSingleUri(context, sourceUri)?.name)
        validateChecksum(entries, preview.checksum)
        PendingRestoreManager.stageRestore(context, raw)
        return preview
    }

    // ------------------------------------------- automatic backup (tree URI)

    suspend fun exportAutomaticBackupToTree(treeUri: Uri): BackupPreview {
        val parent = DocumentFile.fromTreeUri(context, treeUri) ?: error("Pasta de backup inválida")
        val timestamp = DateTimeFormatter.ofPattern("yyyyMMdd_HHmm", Locale.US)
            .withZone(ZoneId.systemDefault())
            .format(Instant.now())
        val file = parent.createFile("application/octet-stream", "lifeflow_auto_$timestamp.lfpbak")
            ?: error("Não foi possível criar o arquivo de backup automático")
        return exportBackup(file.uri)
    }

    // ---------------------------------------------------------- current state

    suspend fun currentPreview(sourceName: String? = null): BackupPreview {
        checkpointDatabase()
        val taskCount = database.taskDao().getAllOnce().size
        val transactionCount = database.transactionDao().getAll().size
        val debtCount = database.debtDao().getAll().size
        val dbBytes = context.getDatabasePath(dbName).takeIf(File::exists)?.readBytes() ?: ByteArray(0)
        return BackupPreview(
            createdAtEpochMillis = System.currentTimeMillis(),
            schemaVersion = 1,
            taskCount = taskCount,
            transactionCount = transactionCount,
            debtCount = debtCount,
            checksum = sha256(dbBytes),
            sourceName = sourceName,
        )
    }

    // ================================================ private helpers

    /** Constrói o payload ZIP interno (sem criptografia) */
    private fun buildZipPayload(preview: BackupPreview): ByteArray {
        val dbFile = context.getDatabasePath(dbName)
        val dbBytes = dbFile.readBytes()
        val walBytes = sidecarBytes("-wal")
        val shmBytes = sidecarBytes("-shm")

        val out = ByteArrayOutputStream()
        ZipOutputStream(out).use { zip ->
            zip.putNextEntry(ZipEntry("metadata.json"))
            zip.write(metadataJson(preview).toByteArray())
            zip.closeEntry()

            zip.putNextEntry(ZipEntry("database/$dbName"))
            zip.write(dbBytes)
            zip.closeEntry()

            walBytes?.let {
                zip.putNextEntry(ZipEntry("database/$dbName-wal"))
                zip.write(it)
                zip.closeEntry()
            }
            shmBytes?.let {
                zip.putNextEntry(ZipEntry("database/$dbName-shm"))
                zip.write(it)
                zip.closeEntry()
            }
        }
        return out.toByteArray()
    }

    /** AES-256-GCM encrypt. Formato: LFPBK2 (6) | salt (32) | IV (12) | ciphertext */
    private fun encryptAesGcm(plaintext: ByteArray): ByteArray {
        val salt = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val iv   = ByteArray(12).also { SecureRandom().nextBytes(it) }
        val key  = deriveKey(salt)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(128, iv))
        val ciphertext = cipher.doFinal(plaintext)

        val out = ByteArrayOutputStream()
        out.write(headerV2)
        out.write(salt)
        out.write(iv)
        out.write(ciphertext)
        return out.toByteArray()
    }

    /** Detecta versão (V1 ou V2) e devolve entries do ZIP interno */
    private fun decryptAndReadEntries(raw: ByteArray): Map<String, ByteArray> {
        return when {
            raw.startsWith(headerV2) -> {
                // LFPBK2: [LFPBK2 6][salt 32][IV 12][ciphertext]
                val salt       = raw.copyOfRange(6, 38)
                val iv         = raw.copyOfRange(38, 50)
                val ciphertext = raw.copyOfRange(50, raw.size)
                val key        = deriveKey(salt)

                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))
                val zipBytes = cipher.doFinal(ciphertext)
                readZipEntries(zipBytes)
            }
            raw.startsWith(headerV1) -> {
                // LFPBK1: legado sem criptografia
                readZipEntries(raw.copyOfRange(headerV1.size, raw.size))
            }
            else -> {
                // Tenta ler diretamente como ZIP (compatibilidade)
                readZipEntries(raw)
            }
        }
    }

    private fun ByteArray.startsWith(prefix: ByteArray): Boolean {
        if (size < prefix.size) return false
        return prefix.indices.all { this[it] == prefix[it] }
    }

    private fun readZipEntries(zipBytes: ByteArray): Map<String, ByteArray> {
        val entries = linkedMapOf<String, ByteArray>()
        ZipInputStream(ByteArrayInputStream(zipBytes)).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                entries[entry.name] = zip.readBytes()
                zip.closeEntry()
                entry = zip.nextEntry
            }
        }
        return entries
    }

    private fun deriveKey(salt: ByteArray): SecretKeySpec {
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val spec = PBEKeySpec(appPassphrase.toCharArray(), salt, 100_000, 256)
        val raw = factory.generateSecret(spec).encoded
        return SecretKeySpec(raw, "AES")
    }

    private suspend fun checkpointDatabase() {
        runCatching {
            database.openHelper.writableDatabase.query("PRAGMA wal_checkpoint(FULL)").close()
        }
    }

    private fun sidecarBytes(suffix: String): ByteArray? {
        val file = File(context.getDatabasePath(dbName).absolutePath + suffix)
        return if (file.exists()) file.readBytes() else null
    }

    private fun validateChecksum(entries: Map<String, ByteArray>, expectedChecksum: String) {
        val dbBytes = entries["database/$dbName"]
            ?: error("Arquivo principal do banco não encontrado no backup")
        val actual = sha256(dbBytes)
        check(actual == expectedChecksum) {
            "Checksum inválido. Esperado $expectedChecksum e obtido $actual"
        }
    }

    private fun metadataJson(preview: BackupPreview): String = JSONObject().apply {
        put("createdAtEpochMillis", preview.createdAtEpochMillis)
        put("schemaVersion", preview.schemaVersion)
        put("taskCount", preview.taskCount)
        put("transactionCount", preview.transactionCount)
        put("debtCount", preview.debtCount)
        put("checksum", preview.checksum)
    }.toString()

    private fun parseMetadata(json: String, sourceName: String?): BackupPreview {
        val o = JSONObject(json)
        return BackupPreview(
            createdAtEpochMillis = o.getLong("createdAtEpochMillis"),
            schemaVersion = o.getInt("schemaVersion"),
            taskCount = o.getInt("taskCount"),
            transactionCount = o.getInt("transactionCount"),
            debtCount = o.getInt("debtCount"),
            checksum = o.getString("checksum"),
            sourceName = sourceName,
        )
    }

    private fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256")
        .digest(bytes)
        .joinToString("") { "%02x".format(it) }
}
