package com.lifeflow.pro.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lifeflow.pro.data.db.DatabaseSeeder
import com.lifeflow.pro.data.db.entities.CategoryEntity
import com.lifeflow.pro.data.db.entities.TaskEntity
import com.lifeflow.pro.data.repository.TaskRepository
import com.lifeflow.pro.domain.model.TaskConstants
import com.lifeflow.pro.domain.model.TaskEditorState
import com.lifeflow.pro.domain.model.TaskFilter
import com.lifeflow.pro.domain.model.TaskStreakCalculator
import com.lifeflow.pro.domain.model.TaskWithCategory
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/** Sinal emitido quando uma tarefa com transação vinculada é concluída (PRD §3.4) */
data class LinkedTransactionPrompt(
    val taskTitle: String,
    val linkedTransactionId: Long,
)

@HiltViewModel
class TasksViewModel @Inject constructor(
    private val taskRepository: TaskRepository,
    private val databaseSeeder: DatabaseSeeder,
) : ViewModel() {

    private val selectedFilter      = MutableStateFlow("TODAS")
    private val editorState         = MutableStateFlow(TaskEditorState())
    private val editingTaskId       = MutableStateFlow<Long?>(null)
    private val isEditorVisible     = MutableStateFlow(false)
    private val linkedTxPrompt      = MutableStateFlow<LinkedTransactionPrompt?>(null)

    val uiState: StateFlow<TasksUiState> = combine(
        taskRepository.observeTasksWithCategories(),
        selectedFilter,
        editorState,
        editingTaskId,
        isEditorVisible,
        linkedTxPrompt,
    ) { (tasks, categories), filter, editor, editingId, editorVisible, prompt ->
        val mapped  = tasks.map { task -> TaskWithCategory(task, categories.firstOrNull { it.id == task.categoryId }) }
        val visible = applyFilter(mapped, filter)
        TasksUiState(
            filters            = buildFilters(categories),
            selectedFilter     = filter,
            tasks              = visible,
            categories         = categories,
            streak             = TaskStreakCalculator.calculateStreak(tasks),
            editor             = editor,
            isEditing          = editingId != null,
            isEditorVisible    = editorVisible,
            linkedTxPrompt     = prompt,
        )
    }.stateIn(
        scope   = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = TasksUiState(),
    )

    init {
        viewModelScope.launch {
            databaseSeeder.seedIfNeeded()
            taskRepository.markOverdueTasks()
        }
    }

    fun selectFilter(filterKey: String) { selectedFilter.value = filterKey }

    fun showCreate() {
        editorState.value   = TaskEditorState()
        editingTaskId.value = null
        isEditorVisible.value = true
    }

    fun showEdit(task: TaskEntity) {
        editorState.value   = TaskEditorState.fromEntity(task)
        editingTaskId.value = task.id
        isEditorVisible.value = true
    }

    fun dismissEditor() { isEditorVisible.value = false }

    fun updateEditor(transform: (TaskEditorState) -> TaskEditorState) {
        editorState.value = transform(editorState.value)
    }

    fun saveTask() {
        val current = editorState.value
        if (current.title.isBlank()) return
        viewModelScope.launch {
            val existingId = editingTaskId.value
            val base = current.toEntity()
            if (existingId == null) {
                taskRepository.save(base)
            } else {
                val currentTask = uiState.value.tasks.firstOrNull { it.task.id == existingId }?.task
                taskRepository.update(
                    base.copy(
                        id           = existingId,
                        createdAt    = currentTask?.createdAt ?: System.currentTimeMillis(),
                        status       = currentTask?.status ?: TaskConstants.STATUS_PENDING,
                        parentTaskId = currentTask?.parentTaskId,
                        completedAt  = currentTask?.completedAt,
                    )
                )
            }
            isEditorVisible.value = false
        }
    }

    /** Conclui ou reabre uma tarefa.  
     *  Se houver transação vinculada e a tarefa for concluída, emite [LinkedTransactionPrompt] (PRD §3.4). */
    fun toggleTaskDone(task: TaskEntity) {
        viewModelScope.launch {
            if (task.status == TaskConstants.STATUS_COMPLETED) {
                taskRepository.markPending(task.id)
            } else {
                val result = taskRepository.markCompleted(task.id)
                val txId   = result?.linkedTransactionId
                if (txId != null) {
                    linkedTxPrompt.value = LinkedTransactionPrompt(
                        taskTitle           = task.title,
                        linkedTransactionId = txId,
                    )
                }
            }
        }
    }

    fun dismissLinkedTxPrompt() { linkedTxPrompt.value = null }

    fun deleteTask(task: TaskEntity) {
        viewModelScope.launch { taskRepository.delete(task) }
    }

    fun focusTask(taskId: Long) {
        selectedFilter.value = "TODAS"
        val task = uiState.value.tasks.firstOrNull { it.task.id == taskId }?.task ?: return
        showEdit(task)
    }

    private fun buildFilters(categories: List<CategoryEntity>): List<TaskFilter> = buildList {
        add(TaskFilter("HOJE",   "Hoje"))
        add(TaskFilter("SEMANA", "Semana"))
        add(TaskFilter("TODAS",  "Todas"))
        categories.forEach { add(TaskFilter("CAT_${it.id}", it.name)) }
    }

    private fun applyFilter(tasks: List<TaskWithCategory>, filter: String): List<TaskWithCategory> {
        val today = LocalDate.now()
        return when {
            filter == "HOJE" -> tasks.filter { it.task.dueDate == today.toString() }
            filter == "SEMANA" -> tasks.filter {
                val due = it.task.dueDate?.let(LocalDate::parse) ?: return@filter false
                !due.isBefore(today) && !due.isAfter(today.plusDays(6))
            }
            filter.startsWith("CAT_") -> {
                val categoryId = filter.removePrefix("CAT_").toLongOrNull()
                tasks.filter { it.task.categoryId == categoryId }
            }
            else -> tasks
        }
    }
}

data class TasksUiState(
    val filters: List<TaskFilter> = listOf(
        TaskFilter("HOJE",   "Hoje"),
        TaskFilter("SEMANA", "Semana"),
        TaskFilter("TODAS",  "Todas"),
    ),
    val selectedFilter:  String                    = "TODAS",
    val tasks:           List<TaskWithCategory>    = emptyList(),
    val categories:      List<CategoryEntity>      = emptyList(),
    val streak:          Int                        = 0,
    val editor:          TaskEditorState            = TaskEditorState(),
    val isEditing:       Boolean                    = false,
    val isEditorVisible: Boolean                    = false,
    val linkedTxPrompt:  LinkedTransactionPrompt?  = null,
)
