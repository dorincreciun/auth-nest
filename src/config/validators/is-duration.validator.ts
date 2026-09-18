import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import ms, { type StringValue } from 'ms';

/**
 * Acceptă doar duratele pe care librăria `ms` le poate interpreta (`"30s"`, `"15m"`, `"7d"`).
 */
@ValidatorConstraint({ name: 'isDuration', async: false })
export class IsDurationConstraint implements ValidatorConstraintInterface {
  public validate(value: unknown): boolean {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return false;
    }

    const milliseconds = ms(value as StringValue);

    return typeof milliseconds === 'number' && Number.isFinite(milliseconds) && milliseconds > 0;
  }

  public defaultMessage(args: ValidationArguments): string {
    return `${args.property} trebuie să fie o durată validă (ex. "30s", "15m", "7d")`;
  }
}

export function IsDuration(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsDurationConstraint,
    });
  };
}
