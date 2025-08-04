import useLayoutStore from "../store/use-layout-store";
import { Texts } from "./texts";
import { Audios } from "./audios";
import { Elements } from "./elements";
import ScriptMenu from "../script-menu";
import { Images } from "./images";
import { Videos } from "./videos";
import { Library } from "./library"; // added import statement

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

  if (activeMenuItem === "library") {
    return <Library />;
  }

  return null;
};

export const MenuItem = () => {
  return (
    <div className="flex h-full w-[300px] flex-col">
      <ActiveMenuItem />
    </div>
  );
};
