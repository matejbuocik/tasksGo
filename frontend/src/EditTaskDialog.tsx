import { Task } from "./TaskTable";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { TaskCreate, createTaskSchema } from "./CreateTaskDialog";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "./components/ui/input";

export default function EditTaskDialog({ task }: { task: Task }) {
  const due = new Date(task.due).getUTCFullYear() == 1 ? undefined : new Date(task.due);
  const form = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    values: {
      text: task.text,
      tags: task.tags.map(tag => ({ tag })),
      due
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tags",
  });

  const [open, setOpen] = useState(false);

  const editTask = async ({ id, task }: { id: number, task: TaskCreate }) => {
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
    mutationFn: editTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const { toast } = useToast();
  function onSubmit(values: z.infer<typeof createTaskSchema>) {
    const editTask = {
      text: values.text,
      tags: values.tags.map(t => t.tag),
      due: values.due,
    };
    mutation.mutate({ id: task.id, task: editTask }, {
      onSuccess: () => { toast({ description: "Task updated ✅", duration: 3000 }); setOpen(false); },
      onError: () => toast({ description: "Could not update task, please try again later.", duration: 3000, variant: "destructive" }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='secondary'>Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription />
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task</FormLabel>
                  <FormControl>
                    <Input placeholder="todo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        weekStartsOn={1}
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const now = new Date();
                          return (date.getFullYear() < now.getFullYear()
                            || (date.getFullYear() === now.getFullYear() && date.getMonth() < now.getMonth())
                            || (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() < now.getDate()));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={() => (
                <FormItem className="flex flex-col items-start">
                  <FormLabel className="text-left">Tags</FormLabel>
                  <FormControl className="w-full">
                    <div className="flex flex-col gap-2">
                      {fields.map((field, index) => (
                        <div>
                          <div key={field.id} className="flex flex-row items-center gap-1">
                            <Input {...form.register(`tags.${index}.tag` as const)} />
                            <Button type="button" variant="destructive" onClick={() => remove(index)}>X</Button>
                          </div>
                          {form.formState.errors.tags?.at?.(index) &&
                            <div className="mt-1 text-sm text-destructive">Tag should not be empty.</div>
                          }
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={() => append({ tag: "" })} className="w-12">+</Button>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit">Submit</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}