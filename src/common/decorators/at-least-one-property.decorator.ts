import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'AtLeastOnePropertyConstraint', async: false })
class AtLeastOnePropertyConstraint implements ValidatorConstraintInterface {
  validate(value: Record<string, any> | null | undefined, _arg: ValidationArguments) {
    if (!value || typeof value !== 'object') return false;
    return Object.values(value).some((val) => val !== undefined && val !== null && val !== '');
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Trebuie să furnizați cel puțin un câmp pentru a efectua actualizarea.';
  }
}

export function AtLeastOneProperty(validationOptions?: ValidationOptions) {
  return function (object: object) {
    registerDecorator({
      target: object.constructor,
      propertyName: '',
      options: validationOptions,
      constraints: [],
      validator: AtLeastOnePropertyConstraint,
    });
  };
}
