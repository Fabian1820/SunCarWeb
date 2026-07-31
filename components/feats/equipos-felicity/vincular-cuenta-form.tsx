"use client";

import { useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Loader2, Zap, ShieldCheck } from "lucide-react";

interface VincularCuentaFormProps {
  vinculando: boolean;
  error: string | null;
  onVincular: (payload: {
    fsolar_user: string;
    password: string;
    region: string;
    password_comandos?: string | null;
  }) => Promise<boolean>;
}

export function VincularCuentaForm({ vinculando, error, onVincular }: VincularCuentaFormProps) {
  const [fsolarUser, setFsolarUser] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState("global");
  const [passwordComandos, setPasswordComandos] = useState("");

  const puedeEnviar = fsolarUser.trim().length >= 3 && password.length >= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeEnviar || vinculando) return;
    await onVincular({
      fsolar_user: fsolarUser.trim(),
      password,
      region,
      password_comandos: passwordComandos.trim() || null,
    });
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card className="border-l-4 border-l-teal-600">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center">
              <Zap className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Vincular cuenta FSolar</CardTitle>
              <p className="text-sm text-gray-500">
                Solo se pide una vez. A partir de aquí, todo funciona con tu sesión de SunCar.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fsolar_user">Usuario o correo de FSolar</Label>
              <Input
                id="fsolar_user"
                value={fsolarUser}
                onChange={(e) => setFsolarUser(e.target.value)}
                placeholder="correo@ejemplo.com"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña de FSolar</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="region">Región de la cuenta</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger id="region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="eu">EU</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password_comandos">
                Contraseña de comandos <span className="text-gray-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="password_comandos"
                type="password"
                value={passwordComandos}
                onChange={(e) => setPasswordComandos(e.target.value)}
                placeholder="Solo si conoces la segunda contraseña de FSolar"
              />
              <p className="text-xs text-gray-400">
                Sin ella funciona todo salvo cambiar parámetros de configuración.
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!puedeEnviar || vinculando}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {vinculando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verificando credenciales...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Vincular cuenta
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
