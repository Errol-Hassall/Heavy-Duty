import { Segmented } from '#/components/ui/segmented'
import { setUnit, useUnit } from '#/lib/preferences'

export function UnitToggle({ className }: { className?: string }) {
  const unit = useUnit()
  return (
    <Segmented
      ariaLabel="Weight unit"
      value={unit}
      onChange={setUnit}
      options={[
        { value: 'kg', label: 'kg' },
        { value: 'lb', label: 'lb' },
      ]}
      size="sm"
      className={className}
    />
  )
}
