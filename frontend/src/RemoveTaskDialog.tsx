import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button"
import { Task } from "./TaskTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast";

interface RemoveTaskProps {
  task: Task;
}

export default function RemoveTaskDialog({ task }: RemoveTaskProps) {
  const removeTask = async (id: number) => {
    let headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa('admin' + ":" + 'adminkooo'));
    await fetch(`https://localhost:8080/task/${id}`, { method: 'DELETE', headers });
  }
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: removeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  })

  const { toast } = useToast();
  const onRemove = () => {
    toast({
      description: "Task deleted ✅",
      duration: 3000,
    });
    mutation.mutate(task.id);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='destructive'>Remove</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Really remove?</AlertDialogTitle>
          <AlertDialogDescription>
            {task.text}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-start">
          <AlertDialogCancel>No, do not remove.</AlertDialogCancel>
          <AlertDialogAction onClick={onRemove}>Yes, remove.</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}