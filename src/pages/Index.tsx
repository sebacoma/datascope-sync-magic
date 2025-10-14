import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, Equipment } from "@/integrations/database/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Calendar, Clock, Wrench } from "lucide-react";
const Index = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const {
    data: equipment,
    isLoading,
    error
  } = useQuery({
    queryKey: ['chesterton-equipment'],
    queryFn: () => apiClient.getEquipment()
  });

  // Get unique values for filters
  const equipmentTypes = Array.from(new Set(equipment?.map(e => e.tipo_equipo).filter(Boolean))) as string[];
  const clients = Array.from(new Set(equipment?.map(e => e.zona_cliente).filter(Boolean))) as string[];

  // Filter equipment
  const filteredEquipment = equipment?.filter((item: Equipment) => {
    const matchesSearch = search === "" || 
      item.numero_equipo_tag?.toLowerCase().includes(search.toLowerCase()) || 
      item.form_name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || item.tipo_equipo === typeFilter;
    const matchesClient = clientFilter === "all" || item.zona_cliente === clientFilter;
    return matchesSearch && matchesType && matchesClient;
  });
  return <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      {/* Header */}
      <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground shadow-lg">
        <div className="container py-8 px-4">
          <div className="flex items-center gap-3 mb-2">
            
            <h1 className="text-4xl font-bold">Chesterton - Seguimiento de Equipos</h1>
          </div>
          <p className="text-primary-foreground/80">Sistema de monitoreo y gestión de equipos</p>
        </div>
      </div>

      <div className="container py-8 px-4">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por tag o formulario..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de Equipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {equipmentTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Cliente/Zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients.map(client => <SelectItem key={client} value={client}>{client}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
            <div className="text-2xl font-bold text-primary">{filteredEquipment?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Equipos Registrados</div>
          </Card>
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
            <div className="text-2xl font-bold text-primary">{equipmentTypes.length}</div>
            <div className="text-sm text-muted-foreground">Tipos de Equipos</div>
          </Card>
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
            <div className="text-2xl font-bold text-primary">{clients.length}</div>
            <div className="text-sm text-muted-foreground">Clientes/Zonas</div>
          </Card>
        </div>

        {/* Equipment Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Cargando equipos...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-lg">Error al cargar equipos</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEquipment?.map((item: Equipment) => (
              <Card key={item.id} className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/90 backdrop-blur-sm border-primary/20">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{item.numero_equipo_tag || 'Sin Tag'}</h3>
                      {item.tipo_equipo && <Badge variant="secondary">{item.tipo_equipo}</Badge>}
                    </div>
                    {item.marca_modelo && <p className="text-sm font-medium text-primary">{item.marca_modelo}</p>}
                  </div>

                  {item.zona_cliente && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{item.zona_cliente}</span>
                    </div>
                  )}

                  {item.assigned_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(item.assigned_date).toLocaleDateString('es')}</span>
                    </div>
                  )}

                  {item.ejecutado_por && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Por: {item.ejecutado_por}</span>
                    </div>
                  )}

                  {item.servicio && (
                    <div className="pt-3 border-t">
                      <p className="text-sm">
                        <span className="font-medium">Servicio:</span> {item.servicio}
                      </p>
                    </div>
                  )}

                  {item.form_name && (
                    <div className="text-xs text-muted-foreground">
                      Formulario: {item.form_name}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredEquipment?.length === 0 && <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No se encontraron equipos</p>
            <p className="text-sm text-muted-foreground mt-2">Intenta ajustar los filtros de búsqueda</p>
          </div>}
      </div>
    </div>;
};
export default Index;