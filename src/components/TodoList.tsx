import { TodoItem } from "@/types/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface TodoListProps {
  todos: TodoItem[];
  onToggle?: (id: string) => void;
}

export const TodoList = ({ todos, onToggle }: TodoListProps) => {
  const priorityColors = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-warning text-warning-foreground",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">To-Do List</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks yet. You're all caught up!
          </p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={todo.completed}
                onCheckedChange={() => onToggle?.(todo.id)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <p
                  className={`text-sm font-medium ${
                    todo.completed ? "line-through text-muted-foreground" : "text-card-foreground"
                  }`}
                >
                  {todo.title}
                </p>
                <div className="flex items-center gap-2">
                  <Badge className={priorityColors[todo.priority]} variant="secondary">
                    {todo.priority}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(todo.due_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
