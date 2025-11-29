'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import axios from '@/lib/utils';
import DeleteButton from '@/components/buttons/deleteuser';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    managerLimitPln?: number;
}

interface CurrentUser {
    role: string;
    firstName: string;
    lastName: string;
    email: string;
    managerLimitPln?: number;
}

interface PaginatedResponse {
    user: User[];
    totalPages: number;
    currentPage: number;
    totalUsers: number;
}

export default function UserList() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            fetchCurrentUser();
        }
    }, [mounted]);

    useEffect(() => {
        if (currentUser && mounted) {
            fetchUsers();
        }
    }, [currentUser, currentPage, pageSize, mounted]);

    const fetchCurrentUser = async () => {
        try {
            const response = await axios.get('api/Users/me');
            setCurrentUser(response.data.user);
            setError(null);
        } catch (err: any) {
            setError('Nie udało się pobrać informacji o użytkowniku');
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.get('api/Users', {
                params: {
                    page: currentPage,
                    pageSize: pageSize
                }
            });

            const data: PaginatedResponse = response.data;

            setUsers(data.user || []);
            setTotalPages(data.totalPages || 1);
            setTotalUsers(data.totalUsers || 0);
        } catch (err: any) {
            setError('Nie udało się pobrać listy użytkowników');
        } finally {
            setLoading(false);
        }
    };

    const getUserListTitle = () => {
        if (currentUser?.role === 'admin') {
            return `Lista menedżerów (${currentUser.role.toUpperCase()})`;
        } else if (currentUser?.role === 'manager') {
            return `Lista pracowników (${currentUser.role.toUpperCase()})`;
        }
        return `Lista użytkowników (${currentUser?.role.toUpperCase()})`;
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handlePageSizeChange = (newPageSize: string) => {
        setPageSize(Number(newPageSize));
        setCurrentPage(1);
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= Math.min(5, totalPages); i++) {
                    pages.push(i);
                }
            } else if (currentPage >= totalPages - 2) {
                for (let i = Math.max(totalPages - 4, 1); i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                for (let i = currentPage - 2; i <= currentPage + 2; i++) {
                    pages.push(i);
                }
            }
        }

        return pages;
    };

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Ładowanie...</div>
            </div>
        );
    }

    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        return (
            <Card>
                <CardContent className="py-8">
                    <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-800">
                            Nie masz uprawnień do przeglądania listy użytkowników
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (loading && !users.length) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Ładowanie...</div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{getUserListTitle()}</CardTitle>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert className="mb-4 border-red-200 bg-red-50">
                        <AlertDescription className="text-red-800">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="text-sm text-gray-600">
                        {users.length} z {totalUsers} użytkowników (Strona {currentPage} z {totalPages})
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Wierszy na stronie:</span>
                        <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className='dark:hover:bg-transparent'>
                            <TableHead>Imię</TableHead>
                            <TableHead>Nazwisko</TableHead>
                            <TableHead>Email</TableHead>
                            {currentUser?.role === 'admin' && <TableHead>Limit</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={currentUser?.role === 'admin' ? 4 : 3} className="text-center">
                                    Brak użytkowników
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.firstName}</TableCell>
                                    <TableCell>{user.lastName}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    {currentUser?.role === 'admin' && (
                                        <TableCell>
                                            {user.managerLimitPln ? `${user.managerLimitPln.toLocaleString()} zł` : '-'}
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <Button onClick={() => {
                                            router.push(`/user/edit/${user.id}`);
                                        }}>
                                            Edytuj
                                        </Button>
                                    </TableCell>
                                    <TableCell><DeleteButton userId={user.id}/></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {totalPages > 1 && (
                    <Pagination className="mt-4">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>

                            {getPageNumbers().map((page) => (
                                <PaginationItem key={page}>
                                    <PaginationLink
                                        onClick={() => handlePageChange(page)}
                                        isActive={currentPage === page}
                                        className="cursor-pointer"
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </CardContent>
        </Card>
    );
}