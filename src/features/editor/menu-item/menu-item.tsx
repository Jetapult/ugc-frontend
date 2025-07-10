import useLayoutStore from "../store/use-layout-store";
import { Texts } from "./texts";
import { Audios } from "./audios";
import { Elements } from "./elements";
import ScriptMenu from "../script-menu";
import { Images } from "./images";
import { Videos } from "./videos";

const ActiveMenuItem = () => {
  const { activeMenuItem } = useLayoutStore();

  if (activeMenuItem === "texts") {
    return <Texts />;
  }
  if (activeMenuItem === "shapes") {
    return <Elements />;
  }
  if (activeMenuItem === "videos") {
    return <Videos />;
  }

  if (activeMenuItem === "audios") {
    return <Audios />;
  }

  if (activeMenuItem === "images") {
    return <Images />;
  }

  if (activeMenuItem === "script") {
    return <ScriptMenu />;
  }

  return null;
};

export const MenuItem = () => {
  return (
    <div className="w-[300px] h-full flex flex-col">
      <ActiveMenuItem />
    </div>
  );
};
