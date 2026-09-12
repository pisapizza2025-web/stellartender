import { View } from 'react-native';
import { Text } from 'heroui-native';

import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';

const PHASES = [
  {
    phase: 'PHASE 1',
    title: 'Independent Stellar payment sidecar',
    status: 'This MVP',
    items: ['QR payment requests', 'Payment links', 'Manual POS external tender'],
  },
  {
    phase: 'PHASE 2',
    title: 'NFC and reconciliation',
    status: 'FUTURE',
    items: ['NFC payment launch', 'Automatic reconciliation', 'POS APIs'],
  },
  {
    phase: 'PHASE 3',
    title: 'Native POS integrations',
    status: 'FUTURE',
    items: ['Square', 'Lightspeed', 'Clover'],
  },
  {
    phase: 'PHASE 4',
    title: 'Fiat rails',
    status: 'FUTURE',
    items: ['Fiat on-ramp / off-ramp', 'Open Banking', 'Merchant GBP settlement'],
  },
  {
    phase: 'PHASE 5',
    title: 'Cross-border settlement',
    status: 'FUTURE',
    items: [
      'Cross-border Stellar settlement',
      'Multi-currency merchant settlement',
      'Stablecoin settlement',
      'Automatic payment routing',
    ],
  },
];

export default function RoadmapScreen() {
  return (
    <Screen contentClassName="gap-5">
      <View className="gap-2">
        <Text.Heading type="h2" className="text-neutral-900">
          Roadmap
        </Text.Heading>
        <Text.Paragraph className="text-neutral-500">
          Only Phase 1 is implemented. Everything else is marked FUTURE and is not built yet.
        </Text.Paragraph>
      </View>

      {PHASES.map((phase) => (
        <SectionCard key={phase.phase} eyebrow={phase.phase} title={phase.title}>
          <View
            className={
              phase.status === 'FUTURE'
                ? 'self-start rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1'
                : 'border-settled/30 bg-settled-soft self-start rounded-full border px-3 py-1'
            }
          >
            <Text.Paragraph
              type="body-xs"
              className={
                phase.status === 'FUTURE'
                  ? 'font-semibold tracking-wide text-neutral-600'
                  : 'text-settled font-semibold tracking-wide'
              }
            >
              {phase.status}
            </Text.Paragraph>
          </View>
          {phase.items.map((item) => (
            <Text.Paragraph key={item} type="body-sm" className="text-neutral-600">
              • {item}
            </Text.Paragraph>
          ))}
        </SectionCard>
      ))}
    </Screen>
  );
}
