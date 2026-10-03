    import { IsEmail, MinLength, IsStrongPassword } from 'class-validator';

    export class RegisterDto { 

        @IsEmail()
        email: string;

        @IsStrongPassword(
            {
                minLength: 8,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 1,
                minSymbols: 1
            },
            {
            message:'A senha deve ter mais de 8 caracteres, com pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
            }
        )
        password: string;

        @MinLength(3)
        name: string;

        
    }