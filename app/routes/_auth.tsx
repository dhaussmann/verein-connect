import { Outlet } from 'react-router';
import { Center, Box } from '@mantine/core';

export default function AuthLayout() {
  return (
    <Center mih="100vh" bg="gray.0">
      <Box w={{ base: '100%', sm: 420 }} p="md">
        <Outlet />
      </Box>
    </Center>
  );
}
