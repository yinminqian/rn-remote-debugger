import { useState, useEffect, useMemo } from 'react';
import { Layout, Tabs, Card, Tag, Button, Empty, Typography, Space, Input, message, Modal } from 'antd';
import { ClearOutlined, SearchOutlined, CopyOutlined, CodeOutlined, ApiOutlined, LinkOutlined, AndroidOutlined } from '@ant-design/icons';
import ReactJson from '@microlink/react-json-view';
import { Panel, Group, Separator, useDefaultLayout } from 'react-resizable-panels';
import './App.css';

const { Content } = Layout;
const { Text, Paragraph, Title } = Typography;

function App() {
  const [status, setStatus] = useState('waiting');
  const [networkRequests, setNetworkRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'network-debugger-layout',
    storage: localStorage,
  });

  useEffect(() => {
    const hasShownTip = localStorage.getItem('android-tip-shown');
    if (!hasShownTip) {
      setShowAndroidModal(true);
      localStorage.setItem('android-tip-shown', 'true');
    }
  }, []);

  const showAndroidTip = () => {
    Modal.info({
      title: 'Android 设备连接提示',
      content: (
        <div>
          <p>如果 Android 设备无法连接，请在终端执行以下命令：</p>
          <Input.TextArea
            value="adb reverse tcp:8989 tcp:8989"
            readOnly
            autoSize
            style={{ marginTop: 8, fontFamily: 'monospace' }}
          />
          <Button
            icon={<CopyOutlined />}
            size="small"
            style={{ marginTop: 8 }}
            onClick={() => {
              navigator.clipboard.writeText('adb reverse tcp:8989 tcp:8989');
              message.success('已复制到剪贴板');
            }}
          >
            复制命令
          </Button>
        </div>
      ),
      okText: '知道了'
    });
  };

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8989');

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.channel === 'network') {
          handleNetwork(data);
        } else if (data.channel === 'console') {
          handleConsole(data);
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    ws.onclose = () => {
      setStatus('waiting');
    };

    return () => ws.close();
  }, []);

  const handleNetwork = (data) => {
    if (data.type === 'request') {
      setNetworkRequests(prev => [{
        id: data.id,
        method: data.method,
        url: data.url,
        headers: data.headers,
        body: data.body,
        status: 'pending',
        timestamp: Date.now()
      }, ...prev]);
    }
    else if (data.type === 'response') {
      setNetworkRequests(prev => prev.map(req =>
        req.id === data.id
          ? { ...req, status: data.status, statusText: data.statusText, responseBody: data.body, duration: data.duration }
          : req
      ));
    }
    else if (data.type === 'error') {
      setNetworkRequests(prev => prev.map(req =>
        req.id === data.id
          ? { ...req, status: 'error', error: data.error, duration: data.duration }
          : req
      ));
    }
  };

  const handleConsole = (data) => {
    const consoleMethod = console[data.type] || console.log;
    consoleMethod(...data.args);
  };

  const clearNetwork = () => {
    setNetworkRequests([]);
    setSelectedRequest(null);
    setSearchText('');
  };

  const generateCurl = (req) => {
    let curl = `curl -X ${req.method} '${req.url}'`;

    if (req.headers) {
      Object.entries(req.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'host') {
          curl += ` \\\n  -H '${key}: ${value}'`;
        }
      });
    }

    if (req.body) {
      curl += ` \\\n  -d '${req.body}'`;
    }

    return curl;
  };

  const parseBody = (body) => {
    if (!body) return null;
    try {
      return JSON.parse(body);
    } catch (e) {
      return body;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Copied to clipboard');
    }).catch(() => {
      message.error('Failed to copy');
    });
  };

  const getStatusColor = (status) => {
    if (status === 'pending' || status === 'error') return 'default';
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'warning';
    if (status >= 400 && status < 500) return 'error';
    return 'error';
  };

  const getStatusText = (req) => {
    if (req.status === 'pending') return '...';
    if (req.status === 'error') return 'ERROR';
    return req.status;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // 高亮搜索文本
  const highlightText = (text, search) => {
    if (!search || !text) return text;
    const textStr = String(text);

    const parts = textStr.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase()
        ? <mark key={i} style={{ background: '#fff566', padding: 0 }}>{part}</mark>
        : part
    );
  };

  // 渲染带高亮的 JSON（当有搜索词时使用）
  const renderJsonWithHighlight = (data, search) => {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    if (!search) {
      return (
        <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {jsonStr}
        </pre>
      );
    }

    return (
      <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {highlightText(jsonStr, search)}
      </pre>
    );
  };

  // 渲染 JSON 内容（有搜索词时高亮，否则使用 ReactJson）
  const renderJsonContent = (data, search) => {
    const parsed = typeof data === 'string' ? parseBody(data) : data;

    // 有搜索词时，使用带高亮的纯文本渲染
    if (search && search.trim()) {
      return renderJsonWithHighlight(parsed, search);
    }

    // 没有搜索词时，使用 ReactJson 组件
    if (typeof parsed === 'object' && parsed !== null) {
      return (
        <ReactJson
          src={parsed}
          theme="rjv-default"
          collapsed={1}
          displayDataTypes={false}
          displayObjectSize={false}
          enableClipboard={false}
          style={{ fontSize: '12px' }}
        />
      );
    }

    return (
      <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {data}
      </pre>
    );
  };

  // 递归搜索对象中的所有字符串值
  const searchInObject = (obj, searchLower) => {
    if (!obj) return false;

    if (typeof obj === 'string') {
      return obj.toLowerCase().includes(searchLower);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj).toLowerCase().includes(searchLower);
    }

    if (Array.isArray(obj)) {
      return obj.some(item => searchInObject(item, searchLower));
    }

    if (typeof obj === 'object') {
      return Object.values(obj).some(value => searchInObject(value, searchLower));
    }

    return false;
  };

  // 过滤网络请求
  const filteredRequests = useMemo(() => {
    if (!searchText.trim()) {
      return networkRequests;
    }

    const searchLower = searchText.toLowerCase();

    return networkRequests.filter(req => {
      // 搜索 URL
      if (req.url && req.url.toLowerCase().includes(searchLower)) {
        return true;
      }

      // 搜索请求头
      if (req.headers && searchInObject(req.headers, searchLower)) {
        return true;
      }

      // 搜索请求体
      if (req.body && searchInObject(req.body, searchLower)) {
        return true;
      }

      // 搜索响应体
      if (req.responseBody && searchInObject(req.responseBody, searchLower)) {
        return true;
      }

      return false;
    });
  }, [networkRequests, searchText]);

  const renderRequestTab = () => {
    if (!selectedRequest) return null;

    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '0 24px 24px' }}>
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <Card
            title={
              <Space>
                <span>Request URL</span>
                <Tag color="blue">{selectedRequest.method}</Tag>
              </Space>
            }
            size="small"
          >
            <Paragraph copyable style={{ margin: 0 }}>
              {selectedRequest.url}
            </Paragraph>
          </Card>

          {selectedRequest.headers && (
            <Card title="Headers" size="small">
              {renderJsonContent(selectedRequest.headers, searchText)}
            </Card>
          )}

          {selectedRequest.body && (
            <Card
              title="Body"
              size="small"
              extra={
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => copyToClipboard(selectedRequest.body)}
                >
                  Copy
                </Button>
              }
            >
              {renderJsonContent(selectedRequest.body, searchText)}
            </Card>
          )}
        </Space>
      </div>
    );
  };

  const renderResponseTab = () => {
    if (!selectedRequest) return null;

    if (selectedRequest.status === 'pending') {
      return <div style={{ height: '100%', overflow: 'auto', padding: '0 24px 24px' }}><Empty description="Request is pending..." /></div>;
    }

    if (selectedRequest.status === 'error') {
      return (
        <div style={{ height: '100%', overflow: 'auto', padding: '0 24px 24px' }}>
          <Card>
            <Text type="danger">{selectedRequest.error || 'Request failed'}</Text>
          </Card>
        </div>
      );
    }

    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '0 24px 24px' }}>
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <Card title="Status" size="small">
            <Tag color={getStatusColor(selectedRequest.status)}>
              {selectedRequest.status} {selectedRequest.statusText}
            </Tag>
            {selectedRequest.duration && (
              <Tag style={{ marginLeft: 8 }}>
                {selectedRequest.duration}ms
              </Tag>
            )}
          </Card>

          {selectedRequest.responseBody && (
            <Card
              title="Response Body"
              size="small"
              extra={
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => copyToClipboard(selectedRequest.responseBody)}
                >
                  Copy
                </Button>
              }
            >
              {renderJsonContent(selectedRequest.responseBody, searchText)}
            </Card>
          )}
        </Space>
      </div>
    );
  };

  const renderCurlTab = () => {
    if (!selectedRequest) return null;

    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '24px' }}>
        <Card
          title="cURL Command"
          size="small"
          extra={
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={() => copyToClipboard(generateCurl(selectedRequest))}
            >
              Copy
            </Button>
          }
        >
          <pre
            style={{
              margin: 0,
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              overflowWrap: 'break-word'
            }}
          >
            {generateCurl(selectedRequest)}
          </pre>
        </Card>
      </div>
    );
  };

  const tabItems = [
    {
      key: 'request',
      label: 'Request',
      children: renderRequestTab()
    },
    {
      key: 'response',
      label: 'Response',
      children: renderResponseTab()
    },
    {
      key: 'curl',
      label: 'cURL',
      children: renderCurlTab()
    }
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: '28px',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitAppRegion: 'drag',
        borderBottom: '1px solid #e0e0e0',
        position: 'relative',
      }}>
        {/* 中间标题 */}
        <span style={{ color: '#666', fontSize: '14px', fontWeight: '500' }}>
          Remote Console Debugger
        </span>
        
        {/* 右侧状态和按钮 */}
        <div style={{ 
          position: 'absolute',
          right: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          WebkitAppRegion: 'no-drag',
        }}>
          {status === 'connected' ? (
            <LinkOutlined style={{ fontSize: '16px', color: '#52c41a' }} />
          ) : (
            <ApiOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} />
          )}
          <div
            onClick={showAndroidTip}
            style={{ 
              color: '#666', 
              cursor: 'pointer', 
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <AndroidOutlined style={{ fontSize: '16px' }} />
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (window.electron && window.electron.toggleDevTools) {
                window.electron.toggleDevTools();
              } else {
                console.log('electron.toggleDevTools not available');
              }
            }}
            style={{ 
              color: '#666', 
              cursor: 'pointer', 
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CodeOutlined style={{ fontSize: '16px' }} />
          </div>
        </div>
      </div>

      <Layout style={{ flex: 1, overflow: 'hidden' }}>
        <Group
          orientation="horizontal"
          defaultLayout={defaultLayout ?? { 'network-list': 50, 'details': 50 }}
          onLayoutChanged={onLayoutChanged}
        >
          <Panel
            id="network-list"
            defaultSize="50%"
            minSize="20%"
            maxSize="80%"
          >
            <div style={{
              height: '100%',
              background: 'white',
              borderRight: '1px solid #f0f0f0',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <Space orientation="vertical" style={{ width: '100%' }} size="small">
                  <Input
                    placeholder="Search URL, headers, body, response..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Text strong>
                      Network ({searchText ? `${filteredRequests.length}/${networkRequests.length}` : networkRequests.length})
                    </Text>
                    <Button
                      icon={<ClearOutlined />}
                      size="small"
                      onClick={clearNetwork}
                      disabled={networkRequests.length === 0}
                    >
                      Clear
                    </Button>
                  </div>
                </Space>
              </div>

              <div style={{ flex: 1, overflow: 'auto' }}>
                {filteredRequests.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <Empty description="No network requests" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                ) : (
                  filteredRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        background: selectedRequest?.id === req.id ? '#e6f7ff' : 'transparent',
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onClick={() => setSelectedRequest(req)}
                    >
                      <Text type="secondary" style={{ fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {formatTime(req.timestamp)}
                      </Text>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        color: '#1890ff',
                        minWidth: '28px',
                      }}>
                        {req.method}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        color: req.status === 'pending' ? '#999' :
                               req.status === 'error' ? '#ff4d4f' :
                               req.status >= 200 && req.status < 300 ? '#52c41a' :
                               req.status >= 400 ? '#ff4d4f' : '#faad14',
                        minWidth: '24px',
                      }}>
                        {getStatusText(req)}
                      </span>
                      <div style={{
                        flex: 1,
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {highlightText(req.url, searchText)}
                      </div>
                      <Text type="secondary" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {req.duration ? `${req.duration}ms` : '...'}
                      </Text>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>

          <Separator 
            className="resize-handle"
            style={{
              width: '6px',
              background: '#f0f0f0',
              position: 'relative',
              transition: 'all 0.2s ease'
            }}
          />

          <Panel
            id="details"
            defaultSize="50%"
            minSize="20%"
            maxSize="80%"
          >
            <Content style={{ background: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
          {selectedRequest ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Tabs
                defaultActiveKey="request"
                items={tabItems}
                size="large"
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingLeft: '16px' }}
              />
            </div>
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Empty
                description="Select a network request to view details"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}
          </Content>
          </Panel>
        </Group>
      </Layout>

      <Modal
        title="Android 设备连接提示"
        open={showAndroidModal}
        onOk={() => setShowAndroidModal(false)}
        onCancel={() => setShowAndroidModal(false)}
        okText="知道了"
        cancelText="关闭"
      >
        <div>
          <p>如果 Android 设备无法连接，请在终端执行以下命令：</p>
          <Input.TextArea
            value="adb reverse tcp:8989 tcp:8989"
            readOnly
            autoSize
            style={{ marginTop: 8, fontFamily: 'monospace' }}
          />
          <Button
            icon={<CopyOutlined />}
            size="small"
            style={{ marginTop: 8 }}
            onClick={() => {
              navigator.clipboard.writeText('adb reverse tcp:8989 tcp:8989');
              message.success('已复制到剪贴板');
            }}
          >
            复制命令
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
