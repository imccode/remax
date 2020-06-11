import { createHostComponent } from '@remax/shared';

import { BaseProps } from '../../types/component';

export interface FormProps extends BaseProps {
  onSubmit?: (e: any) => void;
  onReset?: (e: any) => void;
  reportSubmit?: boolean;
  catchSubmit?: (e: any) => void;
  catchReset?: (e: any) => void;
}

export const Form = createHostComponent<FormProps>('form');
