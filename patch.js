import fs from 'fs';
const path = 'frontend/src/pages/map/MonumentChat.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('hasSentInitialContext')) {
  // We need to add state for it
  content = content.replace(
    'const [showWall, setShowWall] = useState(false);',
    'const [showWall, setShowWall] = useState(false);\n  const [hasSentInitialContext, setHasSentInitialContext] = useState(false);'
  );

  // We need to add the useEffect below handleSendText
  const hookStr = `
  useEffect(() => {
    if (initialContext && sessionId && !hasSentInitialContext) {
      handleSendText(initialContext);
      setHasSentInitialContext(true);
    }
  }, [initialContext, sessionId, hasSentInitialContext, handleSendText]);
`;
  
  // Find where to insert it (after handleSendText block)
  // Let's just put it right before "return (" 
  const returnIdx = content.lastIndexOf('return (');
  if (returnIdx !== -1) {
    content = content.slice(0, returnIdx) + hookStr + '\n  ' + content.slice(returnIdx);
    fs.writeFileSync(path, content);
    console.log("Patched MonumentChat.jsx successfully.");
  } else {
    console.log("Could not find return statement.");
  }
} else {
  console.log("Already patched.");
}
