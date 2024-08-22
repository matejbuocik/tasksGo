import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button"
import { Task, removeTask } from "./task";
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
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: removeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  })

  const { toast } = useToast();
  const onRemove = () => {
    mutation.mutate(task.id, {
      onSuccess: () => toast({ description: "Task deleted ✅", duration: 3000 }),
      onError: () => toast({ description: "Could not delete task, please try again later.", duration: 3000, variant: "destructive" }),
    });
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