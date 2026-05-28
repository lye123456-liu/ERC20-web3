// components/Greeting.tsx
// 注意：在 Next.js + TypeScript 中，我们需要为 props 定义类型
type GreetingProps = {
  name: string
}

export default function Greeting({ name }: GreetingProps) {
  return <p>你好, {name}！</p>
}