import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Tag, TagInput } from 'emblor';
import { useState } from "react"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"

const formSchema = z.object({
  text: z.string().min(1, 'Task should have at least 1 letter.'),
  due: z.date().optional(),
  tags: z.array(
    z.string().min(1, 'Tag should not be empty.')
  ).optional(),
})

export default function CreateTaskDialog() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: "",
    },
  });

  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);

  const createTask = async (task: z.infer<typeof formSchema>) => {
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa('admin' + ":" + 'adminkooo'));
    headers.set('Content-Type', 'application/json');
    await fetch(`https://localhost:8080/task`, { method: 'POST', headers, body: JSON.stringify(task) });
  }
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const { toast } = useToast();
  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);

    form.reset();
    setTags([]);
    setActiveTagIndex(null);

    toast({
      description: "Task created ✅",
      duration: 3000,
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className='mb-8 text-xl w-48'>Add Task</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new task</DialogTitle>
          <DialogDescription>What to do</DialogDescription>
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

            {form.formState.isValid && <DialogClose asChild><Button type="submit">Submit</Button></DialogClose>}
            {!form.formState.isValid && <Button type="submit">Submit</Button>}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
