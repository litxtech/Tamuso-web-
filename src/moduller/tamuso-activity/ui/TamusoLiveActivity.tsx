import { HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';

type LiveActivityEnvironment = 'preview' | 'dynamicIsland' | 'lockScreen' | string;

type LiveActivityHandle = {
  start?: (props: Props, deepLink?: string) => { update?: (p: Props) => void; end?: () => void };
  getInstances?: () => unknown[];
};

/**
 * Tamuso Live Activity layout — Dynamic Island + Lock Screen.
 * Widget runtime: no hooks, no external imports of app state.
 * All values must come from props.
 *
 * Native factory only exists when expo-widgets config plugin is enabled.
 * Without App Groups / widget target we soft-stub so JS never crashes.
 */
type Props = {
  activityType: string;
  activityId: string;
  status: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  countLabel: string;
  progress: number;
  iconKey: string;
  deepLink: string;
  accent: string;
};

function accentColor(accent: string, reduced: boolean): string {
  if (reduced) return '#FFFFFF';
  switch (accent) {
    case 'live':
      return '#FF3B30';
    case 'call':
      return '#34C759';
    case 'room':
      return '#E84091';
    case 'upload':
      return '#0A84FF';
    case 'music':
      return '#BF5AF2';
    case 'tournament':
      return '#FFD60A';
    default:
      return '#E84091';
  }
}

const TamusoLiveActivityLayout = (
  props: Props,
  environment: LiveActivityEnvironment,
) => {
  'widget';

  const accent = accentColor(props.accent, environment.isLuminanceReduced);
  const showProgress = props.progress >= 0 && props.progress <= 100;
  const progressText = showProgress ? `${Math.round(props.progress)}%` : '';
  const trailingCompact =
    progressText || props.timeLabel || props.countLabel || '';

  const bannerBody = (
    <VStack modifiers={[padding({ all: 12 })]}>
      <HStack>
        <Image systemName={props.iconKey || 'app.fill'} color={accent} />
        <VStack>
          <Text
            modifiers={[
              font({ weight: 'semibold', size: 15 }),
              foregroundStyle('#FFFFFF'),
            ]}
          >
            {props.title || 'Tamuso'}
          </Text>
          {props.subtitle ? (
            <Text modifiers={[font({ size: 13 }), foregroundStyle('#AEAEB2')]}>
              {props.subtitle}
            </Text>
          ) : null}
        </VStack>
      </HStack>
      {props.countLabel || props.timeLabel || progressText ? (
        <HStack>
          {props.countLabel ? (
            <Text modifiers={[font({ size: 13 }), foregroundStyle('#EBEBF5')]}>
              {props.countLabel}
            </Text>
          ) : null}
          {props.timeLabel ? (
            <Text modifiers={[font({ size: 13 }), foregroundStyle('#EBEBF5')]}>
              {props.timeLabel}
            </Text>
          ) : null}
          {progressText ? (
            <Text modifiers={[font({ size: 13 }), foregroundStyle(accent)]}>
              {progressText}
            </Text>
          ) : null}
        </HStack>
      ) : null}
    </VStack>
  );

  return {
    banner: bannerBody,
    compactLeading: (
      <Image systemName={props.iconKey || 'app.fill'} color={accent} />
    ),
    compactTrailing: trailingCompact ? (
      <Text modifiers={[font({ size: 12 }), foregroundStyle('#FFFFFF')]}>
        {trailingCompact.length > 18
          ? trailingCompact.slice(0, 16) + '…'
          : trailingCompact}
      </Text>
    ) : (
      <Text modifiers={[font({ size: 12 }), foregroundStyle('#FFFFFF')]}>
        {props.title.slice(0, 12)}
      </Text>
    ),
    minimal: <Image systemName={props.iconKey || 'app.fill'} color={accent} />,
    expandedLeading: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Image systemName={props.iconKey || 'app.fill'} color={accent} />
      </VStack>
    ),
    expandedTrailing: (
      <VStack modifiers={[padding({ all: 8 })]}>
        {props.timeLabel ? (
          <Text
            modifiers={[
              font({ weight: 'bold', size: 16 }),
              foregroundStyle('#FFFFFF'),
            ]}
          >
            {props.timeLabel}
          </Text>
        ) : null}
        {progressText ? (
          <Text modifiers={[font({ size: 14 }), foregroundStyle(accent)]}>
            {progressText}
          </Text>
        ) : null}
        {props.countLabel ? (
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#AEAEB2')]}>
            {props.countLabel}
          </Text>
        ) : null}
      </VStack>
    ),
    expandedCenter: (
      <VStack>
        <Text
          modifiers={[
            font({ weight: 'semibold', size: 15 }),
            foregroundStyle('#FFFFFF'),
          ]}
        >
          {props.title}
        </Text>
        {props.subtitle ? (
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#AEAEB2')]}>
            {props.subtitle}
          </Text>
        ) : null}
      </VStack>
    ),
    expandedBottom: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#8E8E93')]}>
          Tamuso
        </Text>
      </VStack>
    ),
  };
};

const stubLiveActivity: LiveActivityHandle = {
  start: () => ({
    update: () => undefined,
    end: () => undefined,
  }),
  getInstances: () => [],
};

let TamusoLiveActivity: LiveActivityHandle = stubLiveActivity;
try {
  // Optional native — absent when expo-widgets plugin / App Groups disabled
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createLiveActivity } = require('expo-widgets') as {
    createLiveActivity: (
      name: string,
      layout: typeof TamusoLiveActivityLayout,
    ) => LiveActivityHandle;
  };
  if (typeof createLiveActivity === 'function') {
    TamusoLiveActivity = createLiveActivity(
      'TamusoLiveActivity',
      TamusoLiveActivityLayout,
    );
  }
} catch {
  TamusoLiveActivity = stubLiveActivity;
}

export default TamusoLiveActivity;
