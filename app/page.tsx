import { Scale, Briefcase, Clock, CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  {
    label: "Processos ativos",
    value: "128",
    icon: Scale,
    hint: "+6 nesta semana",
  },
  {
    label: "Clientes",
    value: "47",
    icon: Briefcase,
    hint: "3 novos este mes",
  },
  {
    label: "Prazos proximos",
    value: "12",
    icon: Clock,
    hint: "Vence nos proximos 7 dias",
  },
  {
    label: "Audiencias",
    value: "5",
    icon: CalendarClock,
    hint: "Agendadas para esta semana",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-8 py-12">
      <header className="flex flex-col gap-3">
        <Badge className="w-fit bg-brand-navy text-white hover:bg-brand-navy/90">
          Painel Juridico
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-brand-navy sm:text-5xl">
          Gestao Processual
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Organize processos, clientes e prazos em um unico painel. Acompanhe
          audiencias, gere relatorios e mantenha sua equipe sincronizada.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Button className="bg-brand-navy hover:bg-brand-navy/90">
            Novo processo
          </Button>
          <Button variant="outline">Importar planilha</Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-muted">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-brand-navy" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-brand-navy">
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Processos recentes</CardTitle>
            <CardDescription>
              Atualizacoes dos ultimos 7 dias nos processos do escritorio.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Lista de processos aparecera aqui.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proximas audiencias</CardTitle>
            <CardDescription>Agenda da semana</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Agenda aparecera aqui.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
