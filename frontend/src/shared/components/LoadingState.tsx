interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
      <div className="text-lg text-muted-foreground">{message}</div>
    </div>
  )
}
