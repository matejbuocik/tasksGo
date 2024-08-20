import { Task } from "./TaskTable";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createTaskSchema } from "./CreateTaskDialog";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Tag, TagInput } from 'emblor';
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
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
    defaultValues: {
      text: task.text,
      tags: task.tags,
      due
    },
  });

  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>(task.tags.map(t => ({ id: `edit-${t}`, text: t })));
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);

  const editTask = async ({ id, task }: { id: number, task: z.infer<typeof createTaskSchema> }) => {
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
    mutation.mutate({ id: task.id, task: values }, {
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
              render={({ field }) => (
                <FormItem className="flex flex-col items-start">
                  <FormLabel className="text-left">Tags</FormLabel>
                  <FormControl className="w-full">
                    <TagInput
                      {...field}
                      placeholder="Enter a tag"
                      tags={tags}
                      className="sm:min-w-[450px]"
                      setTags={(newTags) => {
                        setTags(newTags);
                        form.setValue('tags', (newTags as Tag[]).map(t => t.text));
                      }}
                      activeTagIndex={activeTagIndex}
                      setActiveTagIndex={setActiveTagIndex}
                      styleClasses={{ input: 'h-10 w-full focus:border-[3px] focus:border-black', tag: { body: 'h-10' } }}
                    />
                  </FormControl>
                  <FormMessage />
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