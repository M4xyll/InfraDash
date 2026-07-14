import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

export async function registerUser(email: string, password: string, name: string) {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateUserRole(id: string, role: 'ADMIN' | 'OPERATOR' | 'VIEWER') {
  return prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER' = 'VIEWER'
) {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string; role?: 'ADMIN' | 'OPERATOR' | 'VIEWER'; password?: string }
) {
  if (data.email) {
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id } },
    });
    if (existingUser) {
      throw new Error('Email already in use');
    }
  }

  const updateData: { name?: string; email?: string; role?: 'ADMIN' | 'OPERATOR' | 'VIEWER'; password?: string } = {
    name: data.name,
    email: data.email,
    role: data.role,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function deleteUser(id: string, currentUserId: string) {
  if (id === currentUserId) {
    throw new Error('Cannot delete yourself');
  }

  return prisma.user.delete({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}
