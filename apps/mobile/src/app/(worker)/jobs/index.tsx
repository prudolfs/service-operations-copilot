import { api } from '@service-ops/convex/api'
import type { Doc } from '@service-ops/convex/dataModel'
import { useQuery } from 'convex/react'
import { router } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

function JobRow({ job }: { job: Doc<'serviceRequests'> }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/(worker)/jobs/${job._id}`)}
      className="rounded-2xl border border-surface-3 bg-surface-1 p-4 active:bg-surface-2"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-base text-surface-text">
          {formatServiceType(job.serviceType)}
        </Text>
        <StatusBadge status={job.status} />
      </View>
      <Text className="mt-2 text-sm text-surface-text-muted">
        {formatDateTime(job.date, job.time)}
      </Text>
      {job.notes ? (
        <Text
          numberOfLines={2}
          className="mt-2 text-sm text-surface-text-muted"
        >
          {job.notes}
        </Text>
      ) : null}
    </Pressable>
  )
}

function Section({
  title,
  emptyHint,
  jobs,
}: {
  title: string
  emptyHint: string
  jobs: Doc<'serviceRequests'>[] | undefined
}) {
  return (
    <View className="mt-6">
      <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
        {title}
      </Text>
      {jobs === undefined ? (
        <Text className="mt-3 text-base text-surface-text-muted">Loading…</Text>
      ) : jobs.length === 0 ? (
        <GlassSurface style={{ padding: 20, marginTop: 12 }}>
          <Text className="text-base text-surface-text-muted">{emptyHint}</Text>
        </GlassSurface>
      ) : (
        <View className="mt-3 gap-3">
          {jobs.map((j) => (
            <JobRow key={j._id} job={j} />
          ))}
        </View>
      )}
    </View>
  )
}

export default function WorkerJobsList() {
  const open = useQuery(api.serviceRequests.listOpen)
  const mine = useQuery(api.serviceRequests.listMyJobs)

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <ScrollView contentContainerClassName="px-6 pb-12">
        <View className="pt-6 pb-2">
          <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
            Worker · Jobs
          </Text>
          <Text className="mt-2 font-black text-3xl text-surface-text">
            Your work
          </Text>
        </View>

        <Section
          title="My jobs"
          emptyHint="You have no active assignments."
          jobs={mine}
        />
        <Section
          title="Open jobs"
          emptyHint="No open requests right now."
          jobs={open}
        />
      </ScrollView>
    </View>
  )
}
