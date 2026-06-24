import { AppShell, Box } from "@mantine/core";
import { RepoProvider } from "./context/RepoContext";
import TopBar from "./components/Shell/TopBar";
import TabSwitcher from "./components/Shell/TabSwitcher";
import ContextBox from "./components/ContextBox";

export default function App() {
  return (
    <RepoProvider>
      <AppShell header={{ height: 64 }} padding="md">
        <AppShell.Header>
          <TopBar />
        </AppShell.Header>
        <AppShell.Main>
          <Box pos="relative" h="100%">
            <TabSwitcher />
            <ContextBox />
          </Box>
        </AppShell.Main>
      </AppShell>
    </RepoProvider>
  );
}
