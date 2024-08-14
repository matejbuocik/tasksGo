import { animated, useSpring } from '@react-spring/web'
import TaskTable from './TaskTable';
import CreateTaskDialog from './CreateTaskDialog';
import { Toaster } from "@/components/ui/toaster";

function App() {
  // TODO login
  const springsHeading = useSpring({
    from: { opacity: 0, fontSize: '0rem' },
    to: { opacity: 1, fontSize: '5rem' },
  })
  const springs = useSpring({
    config: { duration: 500 },
    from: { opacity: 0 },
    to: { opacity: 1 },
  })

  return (
    <main>
      <animated.h1 className='m-0 pb-8 text-center' style={{ ...springsHeading }}>
        TasksGo!
      </animated.h1>
      <animated.div style={{ ...springs }} className='flex flex-col items-center'>
        <CreateTaskDialog />
        <TaskTable />
      </animated.div>
      <Toaster />
    </main>
  )
}

export default App
