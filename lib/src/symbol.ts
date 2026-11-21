import type { InjectionKey } from 'vue'
import type { DesignInstance, FormInstance, Globals } from '@/types'
import type { UIAdapter } from '@/types/uiAdapter'
import type { VeeValidationContext } from '@/validation'

export const $globals = Symbol() as InjectionKey<Globals>

export const $formInstance = Symbol() as InjectionKey<FormInstance>

export const $designInstance = Symbol() as InjectionKey<DesignInstance>

export const $uiAdapter = Symbol() as InjectionKey<UIAdapter>

/** VeeValidate 校验上下文（由 FormRender 提供） */
export const $validationContext = Symbol() as InjectionKey<VeeValidationContext>
