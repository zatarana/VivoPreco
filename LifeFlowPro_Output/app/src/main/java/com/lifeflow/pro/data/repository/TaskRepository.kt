package com.lifeflow.pro.data.repository

import android.content.Context
import com.lifeflow.pro.data.db.dao.CategoryDao
import com.lifeflow.pro.data.db.dao.TaskDao
import com.lifeflow.pro.data.db.entities.CategoryEntity
import com.lifeflow.pro.data.db.entities.TaskEntity
import com.lifeflow.pro.domain.model.TaskConstants
import com.lifeflow.pro.domain.model.TaskRecurrenceCalculator
import com.lifeflow.pro.widget.LifeFlowWidgets
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import java.time.LocalDate
import java.time.LocalDateTime
import javax.inject.Inject
import javax.inject.Singleton

/** Resultado de markCompleted — inclui o ID de transação vinculada para o fluxo PRD §3.4 */
data class TaskCompletionResult(
    val completedTask: TaskEntity,
    val linkedTransactionId: Long?,
)

@Singleton
class TaskRepository @Inject constructor(
    private val taskDao: TaskDao,
    private val categoryDao: CategoryDao,
    @ApplicationContext private val context: Context,
) {
    fun observeTasks(): Flow<List<TaskEntity>> = taskDao.observeAll()

    fun observeTaskCategories(): Flow<List<CategoryEntity>> = categoryDao.observeByType("TASK")

    fun observeTasksWithCategories(): Flow<Pair<List<TaskEntity>, List<CategoryEntity>>> =
        combine(taskDao.observeAll(), categoryDao.observeByType("TASK")) { tasks, categories ->
            tasks to categories
        }

    suspend fun save(task: TaskEntity): Long = taskDao.insert(task).also { LifeFlowWidgets.refreshAll(context) }

    suspend fun update(task: TaskEntity) { taskDao.update(task); LifeFlowWidgets.refreshAll(context) }

    suspend fun delete(task: TaskEntity) { taskDao.delete(task); LifeFlowWidgets.refreshAll(context) }

    /**
     * Marca a tarefa como concluída, gera próxima instância recorrente (se houver)
     * e retorna [TaskCompletionResult] com a tarefa concluída e o linkedTransactionId
     * para que a UI possa perguntar "Criar transação correspondente?" (PRD §3.4).
     */
    suspend fun markCompleted(taskId: Long): TaskCompletionResult? {
        val original = taskDao.getById(taskId) ?: return null
        val completed = original.copy(
            status = TaskConstants.STATUS_COMPLETED,
            completedAt = LocalDateTime.now().toString(),
        )
        taskDao.update(completed)
        TaskRecurrenceCalculator.nextInstance(completed)?.let { taskDao.insert(it) }
        LifeFlowWidgets.refreshAll(context)
        return TaskCompletionResult(
            completedTask = completed,
            linkedTransactionId = completed.linkedTransactionId,
        )
    }

    suspend fun markPending(taskId: Long) {
        val original = taskDao.getById(taskId) ?: return
        taskDao.update(original.copy(status = TaskConstants.STATUS_PENDING, completedAt = null))
        LifeFlowWidgets.refreshAll(context)
    }

    suspend fun markOverdueTasks(today: LocalDate = LocalDate.now()) {
        val tasks = taskDao.getAllOnce()
        tasks.filter {
            it.status == TaskConstants.STATUS_PENDING &&
                !it.dueDate.isNullOrBlank() &&
                LocalDate.parse(it.dueDate).isBefore(today)
        }.forEach { task ->
            taskDao.update(task.copy(status = TaskConstants.STATUS_OVERDUE))
        }
        LifeFlowWidgets.refreshAll(context)
    }
}
