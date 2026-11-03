import { z } from 'zod'
import { BUILDER_NODE_ID_PATTERN } from '../constants/builder'
import { BUILDER_CANVAS_CHANNEL } from '../constants/builderEditor'
import { zThemeSettings } from '../theme/settings'
import { ZodBuilderPreviewRequest } from './builderEditor'

/**
 * The messages between the editor and its preview (the canvas), one window
 * framing the other on the same origin. Each side takes a message only from
 * the window it expects (the frame's own, or its parent), from its own
 * origin, on this channel, and only if it parses: a message that does not is
 * ignored, never acted on in part.
 */

const message = <Shape extends z.ZodRawShape>(shape: Shape) => z.object({ channel: z.literal(BUILDER_CANVAS_CHANNEL), ...shape })

const zNodeId = z.string().regex(BUILDER_NODE_ID_PATTERN)

/** Where a section is drawn in the canvas's viewport, in its CSS pixels. */
const zBox = z.object({
  node: zNodeId,
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
})

/** What the editor tells the canvas: the working copies to draw, by document key. */
export const ZodBuilderCanvasCommand = z.discriminatedUnion('type', [
  message({ type: z.literal('documents'), documents: ZodBuilderPreviewRequest.shape.documents }),
  /** The section selected in the editor, or none: the canvas brings it into view and says where it is. */
  message({ type: z.literal('select'), node: zNodeId.nullable() }),
  /** The theme being edited: the canvas draws the page with it, as the published theme will. */
  message({ type: z.literal('theme'), settings: zThemeSettings }),
])

/** What the canvas tells the editor. */
export const ZodBuilderCanvasEvent = z.discriminatedUnion('type', [
  /** It listens: the editor sends the copies to draw. */
  message({ type: z.literal('ready') }),
  /** It drew the copies it was last sent. */
  message({ type: z.literal('drawn') }),
  /** It could not draw them: it shows the last ones it could. */
  message({ type: z.literal('failed') }),
  /** A link was followed: the canvas stays where it is, and asks the editor to open where it leads. */
  message({ type: z.literal('navigate'), path: z.string().startsWith('/').max(2048) }),
  /** A section was clicked: the editor selects it. */
  message({ type: z.literal('pick'), node: zNodeId }),
  /** Where the section under the pointer and the selected one are drawn now; `null` for none in view. */
  message({ type: z.literal('boxes'), hover: zBox.nullable(), selected: zBox.nullable() }),
])

export type BuilderCanvasCommand = z.infer<typeof ZodBuilderCanvasCommand>
export type BuilderCanvasEvent = z.infer<typeof ZodBuilderCanvasEvent>
export type BuilderCanvasBox = z.infer<typeof zBox>
export type BuilderCanvasDocuments = z.infer<typeof ZodBuilderPreviewRequest>['documents']
