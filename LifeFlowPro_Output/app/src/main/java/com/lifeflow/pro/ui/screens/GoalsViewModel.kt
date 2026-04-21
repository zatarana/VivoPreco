package com.lifeflow.pro.ui.screens

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lifeflow.pro.data.db.entities.GoalEntity
import com.lifeflow.pro.data.repository.GoalRepository
import com.lifeflow.pro.domain.model.FinanceConstants
import com.lifeflow.pro.domain.model.GoalProgress
import com.lifeflow.pro.domain.model.calculateGoalProgress
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class GoalsViewModel @Inject constructor(
    private val goalRepository: GoalRepository,
    @ApplicationContext private val context: Context,
) : ViewModel() {

    private val editor           = MutableStateFlow(GoalEditorState())
    private val isEditorVisible  = MutableStateFlow(false)
    private var currentGoals: List<GoalEntity> = emptyList()

    val uiState: StateFlow<GoalsUiState> = combine(
        goalRepository.observeGoals(),
        editor,
        isEditorVisible,
    ) { goals, editorState, visible ->
        currentGoals = goals
        GoalsUiState(
            goals           = goals.map(::calculateGoalProgress),
            editor          = editorState,
            isEditorVisible = visible,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), GoalsUiState())

    fun showCreate() {
        editor.value          = GoalEditorState(icon = "💰")
        isEditorVisible.value = true
    }

    fun showEdit(goalId: Long) {
        val goal = currentGoals.firstOrNull { it.id == goalId } ?: return
        editor.value          = GoalEditorState.fromEntity(goal)
        isEditorVisible.value = true
    }

    fun dismissEditor() { isEditorVisible.value = false }
    fun updateEditor(newState: GoalEditorState) { editor.value = newState }

    fun saveGoal() {
        val state = editor.value
        viewModelScope.launch {
            val target  = state.targetValue.toDoubleOrNull() ?: return@launch
            val current = state.currentValue.toDoubleOrNull() ?: 0.0
            val ratio   = if (target > 0.0) current / target else 0.0
            val status  = if (ratio >= 1.0) FinanceConstants.GOAL_COMPLETED else FinanceConstants.GOAL_ACTIVE

            // Verifica se ultrapassou 80% ou 100% agora (PRD §4.6)
            val prevGoal = currentGoals.firstOrNull { it.id == state.id }
            val prevRatio = if (prevGoal != null && prevGoal.targetValue > 0.0)
                prevGoal.currentValue / prevGoal.targetValue else 0.0

            val entity = GoalEntity(
                id           = state.id,
                name         = state.name,
                icon         = state.icon.ifBlank { "💰" },
                targetValue  = target,
                currentValue = current,
                targetDate   = state.targetDate.ifBlank { null },
                status       = status,
                completedAt  = if (status == FinanceConstants.GOAL_COMPLETED) System.currentTimeMillis() else null,
                createdAt    = state.createdAt ?: System.currentTimeMillis(),
            )
            if (state.id == 0L) goalRepository.saveGoal(entity) else goalRepository.updateGoal(entity)

            // Notificações reativas (PRD §4.6)
            when {
                ratio >= 1.0 && prevRatio < 1.0 ->
                    notifyGoal("🎉 Meta concluída!", "\"${state.name}\" foi atingida. Parabéns!")
                ratio >= 0.8 && prevRatio < 0.8 ->
                    notifyGoal("📈 Quase lá!", "Você completou 80% da meta \"${state.name}\".")
            }

            isEditorVisible.value = false
        }
    }

    fun deleteGoal(goalId: Long) {
        val goal = currentGoals.firstOrNull { it.id == goalId } ?: return
        viewModelScope.launch { goalRepository.deleteGoal(goal) }
    }

    // ---------------------------------------------------------------- private

    private fun notifyGoal(title: String, body: String) {
        val nm = context.getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(CHANNEL_ID, "Metas", NotificationManager.IMPORTANCE_DEFAULT)
        nm.createNotificationChannel(channel)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .build()
        nm.notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification)
    }

    companion object {
        private const val CHANNEL_ID = "goals_channel"
    }
}

data class GoalsUiState(
    val goals:           List<GoalProgress> = emptyList(),
    val editor:          GoalEditorState    = GoalEditorState(),
    val isEditorVisible: Boolean            = false,
)

data class GoalEditorState(
    val id:           Long    = 0,
    val name:         String  = "",
    val icon:         String  = "💰",
    val targetValue:  String  = "",
    val currentValue: String  = "",
    val targetDate:   String  = "",
    val createdAt:    Long?   = null,
) {
    companion object {
        fun fromEntity(goal: GoalEntity) = GoalEditorState(
            id           = goal.id,
            name         = goal.name,
            icon         = goal.icon,
            targetValue  = goal.targetValue.toString(),
            currentValue = goal.currentValue.toString(),
            targetDate   = goal.targetDate.orEmpty(),
            createdAt    = goal.createdAt,
        )
    }
}
