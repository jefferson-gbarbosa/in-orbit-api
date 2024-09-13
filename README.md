# in.orbit

O in.orbit é uma api de **gestão de metas semanais**. 

Esta API foi projetada para ajudar você a criar, gerenciar e acompanhar suas metas de maneira eficaz. A seguir, você encontrará informações sobre como usar os diferentes endpoints disponíveis.
+

## Requisitos

### Requisitos funcionais

- [x] O usuário deve ser capaz de fornecer um título para a meta.;
- [x] O usuário deve ser capaz de obter detalhes de uma meta específica;
- [x] O usuário deve ser capaz de confirmar quando sua meta; 
- [x] O usuário deve poder visualizar seu quadro de metas pendentes;

### Requisitos não-funcionais

- [x] A API deve ter um desempenho adequado para garantir uma boa experiência do usuário;

## Documentação da API (Swagger)

Para documentação da API, acesse o link: https://in-orbit-api.onrender.com/docs

## Banco de dados

Nessa aplicação vamos utilizar banco de dados relacional (SQL). Para ambiente de desenvolvimento seguiremos com o Postgresql pela facilidade do ambiente.

### Estrutura do banco (SQL)

```sql
-- CreateTable
CREATE TABLE IF NOT EXISTS "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"desired_weekly_frequency" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "goal_completions" (
	"id" text PRIMARY KEY NOT NULL,
	"goal_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "goal_completions" ADD CONSTRAINT "goal_completions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

```



