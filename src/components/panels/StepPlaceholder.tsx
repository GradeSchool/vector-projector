interface StepPlaceholderProps {
  step: number
  title: string
  description?: string
}

export function StepPlaceholder({ step, title, description }: StepPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
        <span className="text-slate-400 font-medium">{step}</span>
      </div>
      <h3 className="font-medium text-sm text-slate-700">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      )}
    </div>
  )
}
