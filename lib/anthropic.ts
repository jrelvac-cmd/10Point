import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

/**
 * Haiku suffit pour de l'extraction de texte structuré et garde le coût par
 * scan autour de 0,002 $. Si les tests terrain montrent trop d'erreurs
 * d'identification, passer à "claude-sonnet-5" ici suffit.
 */
const VISION_MODEL = "claude-haiku-4-5";

export const CardExtractionSchema = z.object({
  name_fr: z
    .string()
    .nullable()
    .describe("Nom exactement comme imprimé sur la carte, en français"),
  number: z
    .string()
    .nullable()
    .describe('Numéro de la carte seul, sans le total (pour 4/102 -> "4")'),
  set_total: z
    .string()
    .nullable()
    .describe('Nombre total de cartes du set (pour 4/102 -> "102")'),
  is_pokemon_card: z
    .boolean()
    .describe("false si l'image n'est pas une carte Pokémon"),
});

export type CardExtraction = z.infer<typeof CardExtractionSchema>;

const SYSTEM_PROMPT = `Tu extrais les informations imprimées sur une carte Pokémon française.

RÈGLES ABSOLUES :
- Tu ne fais que LIRE ce qui est visible. Tu n'inventes jamais.
- Si un champ est illisible, flou, coupé ou incertain : renvoie null.
- Ne devine jamais un numéro de carte. Un chiffre mal lu donne un mauvais prix.
- name_fr : recopie le nom tel qu'il est imprimé, sans le traduire ni le
  corriger (« Dracaufeu » reste « Dracaufeu »). Inclus le suffixe s'il y en a
  un (ex : « Pikachu ex », « Dracaufeu V »).
- Le numéro est en bas de la carte, au format "4/102", "025/165" ou "TG12/TG30".
  Sépare le numéro (avant le /) et le total (après le /). Garde les zéros
  initiaux tels qu'imprimés.
- is_pokemon_card : false si l'image ne montre pas une carte Pokémon.

Tu ne donnes jamais de prix ni d'estimation de valeur.`;

/**
 * Les clés « identity-linked » exigent un en-tête anthropic-workspace-id, que
 * les clés de workspace classiques ne demandent pas. On ne l'envoie que s'il
 * est renseigné : le code fonctionne ainsi avec les deux types de clé.
 */
function anthropicClient() {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  return new Anthropic(
    workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {},
  );
}

export async function extractCardFromImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<CardExtraction> {
  const client = anthropicClient();

  const response = await client.messages.parse({
    model: VISION_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: "Extrais les informations de cette carte Pokémon.",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(CardExtractionSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("EXTRACTION_FAILED");
  }

  return response.parsed_output;
}
