import { Check } from "lucide-react";
import { Task, editTask } from "./task";
import { Button } from "./components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./components/ui/use-toast";

export default function TaskDoneButton({ task }: { task: Task }) {
  let buttonClass = "border-green-700";
  let checkClass = "text-green-700";
  if (task.done) {
    buttonClass = "border-none bg-green-700 hover:bg-green-500";
    checkClass = "text-background";
  }

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: editTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const { toast } = useToast();
  function onClick() {
    task.done = !task.done;
    mutation.mutate({ id: task.id, task }, {
      onSuccess: () => { toast({ description: task.done ? "Task done ✅" : "Task undone ❌", duration: 3000 }); },
      onError: () => toast({ description: "Could not update task, please try again later.", duration: 3000, variant: "destructive" }),
    });
  }

  return (
    <Button type="button" onClick={() => onClick()} variant="outline" size="icon" className={buttonClass}>
      <Check className={checkClass} />
    </Button>
  );
}