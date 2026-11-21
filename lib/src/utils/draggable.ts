import type { DefineComponent, SlotsType } from 'vue'
import Draggable from 'vuedraggable-es-fix'

/**
 * `vuedraggable-es-fix` does not declare its `item` slot, so the slot scope is
 * inferred as `{}` by Vue's type system. Provide the missing slot typing here.
 */
type DraggableSlots = {
  item: (props: { element: any; index: number }) => any
}

export const VDraggable = Draggable as unknown as DefineComponent<
  Record<string, any>,
  {},
  {},
  {},
  {},
  {},
  {},
  {},
  string,
  {},
  Record<string, any>,
  {},
  SlotsType<DraggableSlots>
>
