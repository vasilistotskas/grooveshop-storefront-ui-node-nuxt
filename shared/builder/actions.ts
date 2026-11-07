import { BUILDER_ACTION_FEATURES } from '../constants/builder'
import type { BlockDefinition, BlockUpgrade, BuilderActionFeature, BuilderActionKind, BuilderDocument, BuilderNode } from '../types/builder'
import { mapSettingsAt, REMOVE_SETTING } from './settingsAt'
import { parseVersionedType } from './upgrade'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isKind = (kind: unknown): kind is BuilderActionKind => typeof kind === 'string' && kind in BUILDER_ACTION_FEATURES

/**
 * A button that could only link can now do more: its link becomes an action
 * that links, under the setting that replaces it. The label keeps its name, so
 * no translation moves.
 */
export const upgradeLinkIntoAction = (from: string, to: string): BlockUpgrade => ({ settings, ...body }) => {
  const { [from]: link, ...kept } = settings
  return { ...body, settings: { ...kept, ...(link === undefined ? {} : { [to]: { kind: 'link', to: link } }) } }
}

/**
 * The document without the actions a feature the store has off would run. Runs
 * before anything is read, as a store with a feature off makes no request to
 * its API: `feature_gate:refused` pages the team.
 */
export function withoutDisabledActions(
  document: BuilderDocument,
  registry: ReadonlyMap<string, BlockDefinition>,
  featureOn: (name: BuilderActionFeature) => boolean,
): BuilderDocument {
  const needed = (kind: BuilderActionKind): readonly BuilderActionFeature[] => BUILDER_ACTION_FEATURES[kind]
  const mapNode = (node: BuilderNode): BuilderNode => {
    const actions = registry.get(parseVersionedType(node.type)?.type ?? '')?.actions ?? []
    return {
      ...node,
      settings: mapSettingsAt(node.settings, actions, action =>
        isRecord(action) && isKind(action.kind) && needed(action.kind).every(featureOn) ? action : REMOVE_SETTING),
      ...(node.blocks && {
        blocks: Object.fromEntries(Object.entries(node.blocks).map(([id, child]) => [id, mapNode(child)])),
      }),
    }
  }
  return {
    ...document,
    sections: Object.fromEntries(Object.entries(document.sections).map(([id, node]) => [id, mapNode(node)])),
  }
}

const isReadyTarget = (target: unknown): target is { status: 'ok', value: Record<string, unknown> } =>
  isRecord(target) && target.status === 'ok' && isRecord(target.value)

function isReady(action: unknown): boolean {
  if (!isRecord(action)) return false
  switch (action.kind) {
    case 'link':
      return typeof action.to === 'string'
    case 'addToCart':
    case 'addToWishlist':
      return isReadyTarget(action.product)
    case 'copyCode':
      return isReadyTarget(action.promotion) && typeof action.promotion.value.code === 'string' && action.promotion.value.code !== ''
    default:
      return false
  }
}

/**
 * `settings`, its data and links read, without the actions that have nothing
 * to act on: a link to a page no longer published, a product gone, a read that
 * failed, an offer that ended or holds no code. The button goes and the section
 * stays, with the `ReadyAction` type holding for whatever a component receives.
 */
export function readyActions(settings: Record<string, unknown>, { actions }: Pick<BlockDefinition, 'actions'>): Record<string, unknown> {
  return actions.length === 0 ? settings : mapSettingsAt(settings, actions, action => isReady(action) ? action : REMOVE_SETTING)
}
