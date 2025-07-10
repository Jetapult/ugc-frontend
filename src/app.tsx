import { useEffect } from "react";
import Editor from "./features/editor";
import useDataState from "./features/editor/store/use-data-state";
import { getCompactFontData } from "./features/editor/utils/fonts";
import { FONTS } from "./features/editor/data/fonts";

import { AuthProvider } from "@/context/AuthContext";
import LoginDialog from "@/components/ui/login-dialog";

export default function App() {
  const { setCompactFonts, setFonts } = useDataState();

  useEffect(() => {
    setCompactFonts(getCompactFontData(FONTS));
    setFonts(FONTS);
  }, []);

  return (
    <AuthProvider>
      <LoginDialog />
      <Editor />
    </AuthProvider>
  );
}
