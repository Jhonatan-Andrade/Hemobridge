import { Body, Controller, Get, Post } from '@nestjs/common';
import { Publico } from '../auth/decorators.js';

@Publico()
@Controller('')
export class HomeController {
    @Get('')
    async home() {
        return [];
    }

    @Get('post')
    async getPost() {
          return [
            {
                id: 1,
                titulo: 'Paraíba registra 14 mortes por dengue em 2026',
                descricao: 'Estado soma 7.296 casos prováveis até 30 de setembro, com alta de 55,2% nos óbitos em relação a 2025. O sorotipo 3 é o mais prevalente.',
                data: '2026-09-30',
                like: 128,
            },
            {
                id: 2,
                titulo: 'Piso da Enfermagem: Ministério divulga valores de setembro',
                descricao: 'Portaria define as parcelas de setembro da assistência financeira complementar repassada a estados, municípios e ao DF.',
                data: '2026-09-30',
                like: 74,
            },
            {
                id: 3,
                titulo: 'Fiocruz e Ministério da Saúde investem em laboratório no Ceará contra o câncer',
                descricao: 'Iniciativa reúne Fiocruz, governo do Ceará, HU Brasil e UFC para ampliar o acesso a terapias avançadas contra o câncer no SUS.',
                data: '2026-09-29',
                like: 215,
            },
            {
                id: 4,
                titulo: 'Canetas emagrecedoras podem chegar ao SUS com até 90% de desconto',
                descricao: 'Ministério projeta gasto anual de cerca de R$ 1,5 bilhão para oferecer os medicamentos contra obesidade gratuitamente.',
                data: '2026-09-29',
                like: 342,
            },
            {
                id: 5,
                titulo: 'Setembro Verde: idosos também podem ser doadores vivos de órgãos',
                descricao: 'Campanha de conscientização reforça que a idade não impede, por si só, a doação de órgãos em vida.',
                data: '2026-09-27',
                like: 96,
            },
            {
                id: 6,
                titulo: 'Saúde fará busca ativa de apostadores após fim das bets',
                descricao: 'Ministério da Saúde planeja identificar e acompanhar pessoas afetadas pelas apostas online.',
                data: '2026-09-25',
                like: 61,
            },
            {
                id: 7,
                titulo: 'Anvisa suspende publicidade da caneta emagrecedora Semavy',
                descricao: 'Agência determinou a suspensão da propaganda do medicamento.',
                data: '2026-09-25',
                like: 53,
            },
            {
                id: 8,
                titulo: 'Governo pede à Conitec incorporação de canetas emagrecedoras no SUS',
                descricao: 'Pedido formal é o passo necessário para que os medicamentos contra obesidade passem a ser oferecidos pela rede pública.',
                data: '2026-09-24',
                like: 187,
            },
        ];
    }

    @Post('post')
    async createPost(@Body() body: {id:string}) {
        const id = body.id;
        return [
            
        ];
    }

}
