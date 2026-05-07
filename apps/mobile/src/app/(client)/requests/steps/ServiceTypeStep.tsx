import type {
  CreateServiceRequestInput,
  ServiceType,
} from '@service-ops/shared'
import { useFormContext, useWatch } from 'react-hook-form'
import { Text, View } from 'react-native'
import { SelectionCard } from '@/components/wizard'
import { SERVICE_TYPE_OPTIONS } from '@/lib/format'

export default function ServiceTypeStep() {
  const {
    setValue,
    formState: { errors },
  } = useFormContext<CreateServiceRequestInput>()
  const selected = useWatch<CreateServiceRequestInput, 'serviceType'>({
    name: 'serviceType',
  })

  return (
    <View className="gap-3">
      {SERVICE_TYPE_OPTIONS.map((opt) => (
        <SelectionCard
          key={opt.value}
          label={opt.label}
          selected={selected === opt.value}
          onPress={() =>
            setValue('serviceType', opt.value as ServiceType, {
              shouldValidate: true,
            })
          }
        />
      ))}
      {errors.serviceType ? (
        <Text className="text-status-progress text-xs">
          {errors.serviceType.message as string}
        </Text>
      ) : null}
    </View>
  )
}
