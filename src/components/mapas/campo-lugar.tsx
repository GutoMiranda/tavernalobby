"use client";

import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

import { CHAVE_MAPS } from "./chave";

type Lugar = { texto: string; lat: string; lng: string; id: string };

type Props = {
  id: string;
  rotulo: string;
  valorInicial?: string | null;
  /** "cidade" para origens; "endereco" para estalagens. */
  tipo: "cidade" | "endereco";
  obrigatorio?: boolean;
};

/**
 * Campo de lugar com autocomplete do Google Places (API nova).
 * Envia no formulário: lugar_texto, lugar_lat, lugar_lng e lugar_id.
 * Sem a chave do Maps, vira um campo de texto simples.
 */
export function CampoLugar(props: Props) {
  const [lugar, setLugar] = useState<Lugar>({ texto: props.valorInicial ?? "", lat: "", lng: "", id: "" });

  const ocultos = (
    <>
      <input type="hidden" name="lugar_texto" value={lugar.texto} />
      <input type="hidden" name="lugar_lat" value={lugar.lat} />
      <input type="hidden" name="lugar_lng" value={lugar.lng} />
      <input type="hidden" name="lugar_id" value={lugar.id} />
    </>
  );

  if (!CHAVE_MAPS) {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={props.id} className="text-sm font-medium">
          {props.rotulo}
        </label>
        <Input
          id={props.id}
          value={lugar.texto}
          required={props.obrigatorio}
          maxLength={300}
          placeholder={props.tipo === "cidade" ? "Ex.: Campinas, SP" : "Rua, número, cidade"}
          onChange={(e) => setLugar({ texto: e.target.value, lat: "", lng: "", id: "" })}
        />
        {ocultos}
      </div>
    );
  }

  return (
    <APIProvider apiKey={CHAVE_MAPS} language="pt-BR" region="BR">
      <div className="flex flex-col gap-1.5">
        <span id={`${props.id}-rotulo`} className="text-sm font-medium">
          {props.rotulo}
        </span>
        <Autocomplete tipo={props.tipo} rotuloId={`${props.id}-rotulo`} onEscolher={setLugar} />
        {lugar.texto && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Selecionado: <strong className="text-foreground">{lugar.texto}</strong>
          </p>
        )}
        {ocultos}
      </div>
    </APIProvider>
  );
}

function Autocomplete({
  tipo,
  rotuloId,
  onEscolher,
}: {
  tipo: Props["tipo"];
  rotuloId: string;
  onEscolher: (l: Lugar) => void;
}) {
  const places = useMapsLibrary("places");
  const caixa = useRef<HTMLDivElement>(null);
  const escolher = useRef(onEscolher);
  escolher.current = onEscolher;

  useEffect(() => {
    if (!places || !caixa.current) return;
    const el = new places.PlaceAutocompleteElement({
      includedRegionCodes: ["br"],
      ...(tipo === "cidade" ? { includedPrimaryTypes: ["(cities)"] } : {}),
      placeholder: tipo === "cidade" ? "Digite a cidade" : "Digite o endereço",
    });
    el.setAttribute("aria-labelledby", rotuloId);
    el.style.colorScheme = "light";
    el.style.width = "100%";

    const aoSelecionar = async (evento: Event) => {
      // Versões da API expõem `place` ou `placePrediction` no evento; aceitamos as duas.
      const e = evento as Event & {
        place?: google.maps.places.Place;
        placePrediction?: { toPlace(): google.maps.places.Place };
      };
      const place = e.place ?? e.placePrediction?.toPlace();
      if (!place) return;
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
      escolher.current({
        texto: place.formattedAddress ?? place.displayName ?? "",
        lat: String(place.location?.lat() ?? ""),
        lng: String(place.location?.lng() ?? ""),
        id: place.id,
      });
    };

    el.addEventListener("gmp-select", aoSelecionar);
    const destino = caixa.current;
    destino.appendChild(el);
    return () => {
      el.removeEventListener("gmp-select", aoSelecionar);
      el.remove();
    };
  }, [places, tipo, rotuloId]);

  return <div ref={caixa} className="min-h-10" />;
}
