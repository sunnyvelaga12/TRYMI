import React from 'react';
import { Box, Button, VStack, Text, HStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

// Wrapper to use React Router's useNavigate inside class component
const ErrorFallbackUI = ({ error, errorInfo, onReset, onReload }) => {
  const navigate = useNavigate();

  const isWebGLError = 
    error?.message?.toLowerCase().includes('webgl') ||
    error?.message?.toLowerCase().includes('context') ||
    error?.message?.toLowerCase().includes('3d') ||
    errorInfo?.componentStack?.includes('Canvas');

  return (
    <Box 
      minH="100vh"
      w="100%" 
      bg="gray.900" 
      display="flex" 
      alignItems="center" 
      justifyContent="center"
      p={4}
    >
      <VStack 
        spacing={6} 
        p={8} 
        bg="gray.800" 
        borderRadius="xl" 
        maxW="600px"
        w="100%"
        boxShadow="2xl"
      >
        <Text fontSize="4xl" fontWeight="bold" color="red.400">
          {isWebGLError ? '⚠️ WebGL Error' : '⚠️ Rendering Error'}
        </Text>
        
        <Text color="gray.300" textAlign="center" fontSize="lg" lineHeight="tall">
          {isWebGLError 
            ? 'Unable to initialize 3D graphics. Your browser or device may not support WebGL, or hardware acceleration is disabled.'
            : 'Something went wrong while rendering the 3D avatar. Please try reloading the page.'}
        </Text>

        {isWebGLError && (
          <VStack 
            spacing={3} 
            align="start" 
            w="100%" 
            color="gray.400" 
            fontSize="sm"
            bg="gray.900"
            p={5}
            borderRadius="md"
            border="1px solid"
            borderColor="gray.700"
          >
            <Text fontWeight="bold" color="green.400" fontSize="md">
              💡 Try these solutions:
            </Text>
            <Text>✓ Enable hardware acceleration in browser settings</Text>
            <Text>✓ Update your graphics drivers</Text>
            <Text>✓ Use Chrome, Firefox, or Edge browser (latest version)</Text>
            <Text>✓ Close other tabs using 3D graphics or heavy applications</Text>
            <Text>✓ Check if WebGL is enabled: <Text as="span" color="blue.400" fontWeight="bold">get.webgl.org</Text></Text>
            <Text>✓ Try in incognito/private mode (to disable extensions)</Text>
          </VStack>
        )}

        {process.env.NODE_ENV === 'development' && error && (
          <VStack 
            spacing={2} 
            align="start" 
            w="100%" 
            fontSize="xs"
            color="red.300"
            bg="blackAlpha.600"
            p={4}
            borderRadius="md"
            maxH="200px"
            overflowY="auto"
            border="1px solid"
            borderColor="red.800"
          >
            <Text fontWeight="bold" fontSize="sm">🔧 Error Details (Development Mode):</Text>
            <Text color="gray.400" fontFamily="mono">{error.toString()}</Text>
            {errorInfo?.componentStack && (
              <Text color="gray.500" fontFamily="mono" fontSize="10px">
                {errorInfo.componentStack.slice(0, 500)}
              </Text>
            )}
          </VStack>
        )}

        <VStack spacing={3} w="100%" pt={2}>
          <HStack spacing={3} w="100%">
            <Button 
              colorScheme="green" 
              onClick={onReload}
              flex={1}
              size="lg"
              leftIcon={<span>🔄</span>}
            >
              Reload Page
            </Button>
            <Button 
              colorScheme="blue"
              variant="outline"
              onClick={onReset}
              flex={1}
              size="lg"
            >
              Try Again
            </Button>
          </HStack>
          
          <HStack spacing={3} w="100%">
            <Button 
              variant="ghost" 
              colorScheme="whiteAlpha"
              onClick={() => navigate('/')}
              flex={1}
              size="md"
            >
              ← Back to Home
            </Button>
            <Button 
              variant="ghost" 
              colorScheme="whiteAlpha"
              onClick={() => navigate('/collections')}
              flex={1}
              size="md"
            >
              Browse Collections
            </Button>
          </HStack>
        </VStack>

        <Text fontSize="xs" color="gray.600" textAlign="center" pt={2}>
          If the problem persists, please contact support or try a different device.
        </Text>
      </VStack>
    </Box>
  );
};

class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state to render fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('❌ WebGL Error Boundary caught an error:', error);
    console.error('📍 Component Stack:', errorInfo?.componentStack);
    
    // Store error info in state for display
    this.setState({
      error,
      errorInfo
    });

    // Optional: Send error to logging service
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    console.log('🔄 Reloading page...');
    // Reset error state and reload
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleReset = () => {
    console.log('🔄 Resetting error boundary...');
    // Reset error state without reloading
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

export default WebGLErrorBoundary;


