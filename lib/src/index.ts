import install from './install'

export default { install }

export { FormRender, FormDesign } from './components'

export { useFormInstance } from '@/hooks'

export { defaultUnitData } from './elements/InputNumber/units'
export type { UnitCategory, UnitOption } from './elements/InputNumber/types'

export * from './uiAdapter'

export type { ValidationEngineName, NormalizedRule } from '@/validation'

export type {
  FormElement,
  FormItemType,
  FormSchema,
  TemplateData,
  FormInstance,
  AiGenerateParams,
  AiGenerateFunction
} from '@/types'
