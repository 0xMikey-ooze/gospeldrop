import { Configuration, LettersApi, UsVerificationsApi } from "@lob/lob";

const config = new Configuration({
  username: process.env.LOB_API_KEY!,
});

export const lettersApi = new LettersApi(config);
export const usVerificationsApi = new UsVerificationsApi(config);
