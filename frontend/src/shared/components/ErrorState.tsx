interface ErrorStateProps {
  title?: string
  message: string
}

export function ErrorState({ title = 'Error', message }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="bg-destructive/20 border border-destructive/50 text-destructive px-4 py-3 rounded">
          <p className="font-semibold">{title}</p>
          <p>{message}</p>
        </div>
      </div>
    </div>
  )
}
