import { Tabs, Center, Text } from "@mantine/core";
import {
  IconFolderFilled, IconGitCommit, IconGitBranch,
  IconBulb, IconMessageCircle, IconFileText,
} from "@tabler/icons-react";
import { useRepo } from "../../context/RepoContext";
import AiOverviewBanner from "../AiOverviewBanner";
import StructureView   from "../views/StructureView";
import CommitsView     from "../views/CommitsView";
import BranchesView    from "../views/BranchesView";
import InsightsView    from "../views/InsightsView";
import ChatView        from "../views/ChatView";
import ReadmeView      from "../views/ReadmeView";

const TABS = [
  { value: "structure", label: "Structure", Icon: IconFolderFilled,    showBanner: true  },
  { value: "commits",   label: "Commits",   Icon: IconGitCommit,       showBanner: true  },
  { value: "branches",  label: "Branches",  Icon: IconGitBranch,       showBanner: true  },
  { value: "insights",  label: "Insights",  Icon: IconBulb,            showBanner: false },
  { value: "chat",      label: "Chat",      Icon: IconMessageCircle,   showBanner: false },
  { value: "readme",    label: "README",    Icon: IconFileText,        showBanner: false },
];

const VIEWS = {
  structure: <StructureView />,
  commits:   <CommitsView />,
  branches:  <BranchesView />,
  insights:  <InsightsView />,
  chat:      <ChatView />,
  readme:    <ReadmeView />,
};

export default function TabSwitcher() {
  const { activeTab, setActiveTab, repoData, loading } = useRepo();

  if (!repoData && !loading) {
    return (
      <Center h="60vh">
        <Text c="dimmed" size="sm">
          Paste a GitHub repo URL above and click Analyze to get started.
        </Text>
      </Center>
    );
  }

  return (
    <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
      <Tabs.List mb="sm">
        {TABS.map(({ value, label, Icon }) => (
          <Tabs.Tab key={value} value={value} leftSection={<Icon size={15} />}>
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {TABS.map(({ value, showBanner }) => (
        <Tabs.Panel key={value} value={value}>
          {showBanner && <AiOverviewBanner view={value} />}
          {VIEWS[value]}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
