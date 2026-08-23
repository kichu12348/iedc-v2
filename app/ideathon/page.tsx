import IdeathonPage from "./Main";
import { checkFormValidity } from "./services/api";

export default async function Ideathon() {
  const { is_valid, close_time } = await checkFormValidity("ideathon");
  return <IdeathonPage closed={!is_valid} deadline={close_time} />;
}
