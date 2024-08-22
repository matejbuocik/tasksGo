import { Check } from "lucide-react";
import { Task } from "./TaskTable";
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

  const setDone = async ({ id, task }: { id: number, task: Task }) => {
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa('admin' + ":" + 'adminkooo'));
    headers.set('Content-Type', 'application/json');
    const res = await fetch(`https://localhost:8080/task/${id}`, { method: 'PUT', headers, body: JSON.stringify(task) });
    if (!res.ok) {
      throw new Error("Something went wrong");
    }
  }
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: setDone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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