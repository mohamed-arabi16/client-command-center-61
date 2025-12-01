import { useState } from "react";
import { TodoItem } from "@/types/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TodoList } from "@/components/TodoList";
import { AddTodoDialog } from "@/components/AddTodoDialog";
import { ListTodo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClientTasksProps {
  todos: TodoItem[];
  clientId: string;
  onTodoAdded: () => void;
}

export const ClientTasks = ({
  todos,
  clientId,
  onTodoAdded,
}: ClientTasksProps) => {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const handleTodoToggle = async (todoId: string) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    try {
      const { error } = await supabase
        .from("todos")
        .update({
          completed: !todo.completed,
          completed_at: !todo.completed ? new Date().toISOString() : null,
        })
        .eq("id", todoId);

      if (error) throw error;

      toast.success(
        !todo.completed ? "Task completed! 🎉" : "Task marked as incomplete"
      );
      onTodoAdded(); // Refresh the list
    } catch (error) {
      console.error("Error updating todo:", error);
      toast.error("Failed to update task");
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            Tasks
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <AddTodoDialog clientId={clientId} onTodoAdded={onTodoAdded} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TodoList todos={filteredTodos} onToggle={handleTodoToggle} />
      </CardContent>
    </Card>
  );
};
