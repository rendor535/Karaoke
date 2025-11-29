'use client';
/*
* 
* WERSJA TESTOWA DO SPRAWDZANIA CZY DZIAŁA BACKEND!!!!!!!
* NIEUPOWAŻNIONYM FRONTENDOWCOM WSTĘP WZBRONIONY!!!!!!!!!!!!!!!!!!!
* 
* */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import axios from '@/lib/utils';
import { useUser } from '@/context/user-context';

interface Request {
    id: number;
    userEmail: string | null;
    userId: number;
    userName: string | null;
    managerId: number | null;
    managerName: string | null;
    description: string;
    amountPln: number;
    reason: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

interface CurrentUser {
    role: string;
    firstName: string;
    lastName: string;
    email: string;
    id: number;
}

interface PaginatedResponse {
    request: Request[];
    totalPages: number;
    currentPage: number;
    totalRequests: number;
    filters?: {
        status?: string;
        minAmount?: number;
        maxAmount?: number;
        dateFrom?: string;
        dateTo?: string;
        searchName?: string;
        sortBy?: string;
        sortOrder?: string;
    };
}

export default function RequestList() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRequests, setTotalRequests] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [mounted, setMounted] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>('');
    
    const [filters, setFilters] = useState({
        status: '',
        minAmount: '',
        maxAmount: '',
        dateFrom: '',
        dateTo: '',
        searchName: '',
        sortBy: '',
        sortOrder: 'asc'
    });
    
    const formatDateForBackend = (dateString: string, isEndDate: boolean = false): string => {
        if (!dateString) return '';

        try {
            if (isEndDate) {
                return dateString + 'T23:59:59.999Z';
            } else {
                return dateString + 'T00:00:00.000Z';
            }
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    };
    
    const statusOptions = [
        'czeka',
        'potwierdzono',
        'odrzucono',
        'zakupione'
    ];
    
    const sortOptions = [
        { value: 'none', label: 'Bez sortowania' },
        { value: 'amount', label: 'Kwota' },
        { value: 'createdat', label: 'Data utworzenia' },
        { value: 'status', label: 'Status' },
        { value: 'username', label: 'Nazwa użytkownika' }
    ];
    
    const sortOrderOptions = [
        { value: 'asc', label: 'Rosnąco' },
        { value: 'desc', label: 'Malejąco' }
    ];

    useEffect(() => {
        console.log('Component mounting...');
        setMounted(true);
        setDebugInfo('Component mounted');
    }, []);

    useEffect(() => {
        if (mounted) {
            console.log('Fetching current user...');
            setDebugInfo('Fetching current user...');
            fetchCurrentUser();
        }
    }, [mounted]);

    useEffect(() => {
        if (currentUser && mounted) {
            console.log('Current user found, fetching requests...', currentUser);
            setDebugInfo(`Current user: ${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`);
            fetchRequests();
        }
    }, [currentUser, currentPage, pageSize, mounted]);

    const fetchCurrentUser = async () => {
        try {
            console.log('Making API call to /api/Users/me');
            const response = await axios.get('/api/Users/me');
            console.log('User response:', response.data);
            setCurrentUser(response.data.user || response.data);
            setError(null);
            setDebugInfo(`User fetched: ${response.data.user?.firstName || 'Unknown'}`);
        } catch (err: any) {
            console.error('Error fetching user:', err);
            setError(`Nie udało się pobrać informacji o użytkowniku: ${err.message}`);
            setDebugInfo(`Error fetching user: ${err.message}`);
        }
    };

    const fetchRequests = async () => {
        try {
            setLoading(true);
            setError(null);
            setDebugInfo('Fetching requests...');

            const params: any = {
                page: currentPage,
                pageSize: pageSize
            };
            
            if (filters.status) params.status = filters.status;
            if (filters.minAmount) params.minAmount = parseFloat(filters.minAmount);
            if (filters.maxAmount) params.maxAmount = parseFloat(filters.maxAmount);
            
            if (filters.dateFrom) params.dateFrom = formatDateForBackend(filters.dateFrom, false);
            if (filters.dateTo) params.dateTo = formatDateForBackend(filters.dateTo, true);

            if (filters.searchName) params.searchName = filters.searchName;
            if (filters.sortBy && filters.sortBy !== 'none') params.sortBy = filters.sortBy;
            if (filters.sortOrder) params.sortOrder = filters.sortOrder;

            console.log('Making API call to /api/Requests with params:', params);
            console.log('Formatted dates:', {
                originalDateFrom: filters.dateFrom,
                formattedDateFrom: params.dateFrom,
                originalDateTo: filters.dateTo,
                formattedDateTo: params.dateTo
            });

            const response = await axios.get('/api/Requests', { params });
            console.log('Requests response:', response.data);

            const data: PaginatedResponse = response.data;

            setRequests(data.request || []);
            setTotalPages(data.totalPages || 1);
            setTotalRequests(data.totalRequests || 0);
            setDebugInfo(`Requests fetched: ${data.request?.length || 0} items`);
        } catch (err: any) {
            console.error('Error fetching requests:', err);
            setError(`Nie udało się pobrać listy żądań: ${err.message}`);
            setDebugInfo(`Error fetching requests: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getRequestListTitle = () => {
        if (currentUser?.role === 'admin') {
            return `Lista żądań (${currentUser.role.toUpperCase()})`;
        } else if (currentUser?.role === 'manager') {
            return `Lista żądań zespołu (${currentUser.role.toUpperCase()})`;
        }
        return `Moje żądania (${currentUser?.role?.toUpperCase() || 'UNKNOWN'})`;
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

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const applyFilters = () => {
        setCurrentPage(1);
        fetchRequests();
    };

    const clearFilters = () => {
        setFilters({
            status: '',
            minAmount: '',
            maxAmount: '',
            dateFrom: '',
            dateTo: '',
            searchName: '',
            sortBy: '',
            sortOrder: 'asc'
        });
        setCurrentPage(1);
        setTimeout(() => {
            fetchRequests();
        }, 100);
    };

    const getStatusBadge = (status: string) => {
        const statusColors = {
            'czeka': 'bg-yellow-100 text-yellow-800',
            'potwierdzono': 'bg-green-100 text-green-800',
            'odrzucono': 'bg-red-100 text-red-800',
            'zakupione': 'bg-blue-100 text-blue-800'
        };

        const statusLabels = {
            'czeka': 'Czeka',
            'potwierdzono': 'Potwierdzone',
            'odrzucono': 'Odrzucone',
            'zakupione': 'Zakupione'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[status as keyof typeof statusLabels] || status}
            </span>
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
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

    console.log('Render state:', { mounted, loading, error, currentUser, requests: requests.length });

    return (
        <div className="w-full">
            <Card>
                <CardHeader>
                    <CardTitle>
                        {currentUser ? getRequestListTitle() : 'Ładowanie...'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
                        <strong>Debug Info:</strong> {debugInfo}
                        <br />
                        <strong>Mounted:</strong> {mounted ? 'Yes' : 'No'}
                        <br />
                        <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
                        <br />
                        <strong>Current User:</strong> {currentUser ? `${currentUser.firstName} (${currentUser.role})` : 'None'}
                        <br />
                        <strong>Requests Count:</strong> {requests.length}
                        <br />
                        <strong>Current Filters:</strong> {JSON.stringify(filters)}
                        <br />
                        <strong>Error:</strong> {error || 'None'}
                    </div>

                    {error && (
                        <Alert className="mb-4 border-red-200 bg-red-50">
                            <AlertDescription className="text-red-800">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {!mounted && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-lg">Inicjalizacja...</div>
                        </div>
                    )}

                    {mounted && !currentUser && !error && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-lg">Pobieranie informacji o użytkowniku...</div>
                        </div>
                    )}

                    {mounted && currentUser && loading && requests.length === 0 && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-lg">Ładowanie żądań...</div>
                        </div>
                    )}

                    {mounted && currentUser && !loading && (
                        <>
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle className="text-lg">Filtry i sortowanie</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <Label htmlFor="status">Status</Label>
                                            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Wszystkie" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Wszystkie</SelectItem>
                                                    {statusOptions.map(status => (
                                                        <SelectItem key={status} value={status}>
                                                            {status === 'czeka' && 'Czeka'}
                                                            {status === 'potwierdzono' && 'Potwierdzone'}
                                                            {status === 'odrzucono' && 'Odrzucone'}
                                                            {status === 'zakupione' && 'Zakupione'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="minAmount">Minimalna kwota (PLN)</Label>
                                            <Input
                                                id="minAmount"
                                                type="number"
                                                step="0.01"
                                                value={filters.minAmount}
                                                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="maxAmount">Maksymalna kwota (PLN)</Label>
                                            <Input
                                                id="maxAmount"
                                                type="number"
                                                step="0.01"
                                                value={filters.maxAmount}
                                                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                                                placeholder="10000.00"
                                            />
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="dateFrom">Data od</Label>
                                            <Input
                                                id="dateFrom"
                                                type="date"
                                                value={filters.dateFrom}
                                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                            />
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="dateTo">Data do</Label>
                                            <Input
                                                id="dateTo"
                                                type="date"
                                                value={filters.dateTo}
                                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                            />
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="searchName">Szukaj po nazwie</Label>
                                            <Input
                                                id="searchName"
                                                type="text"
                                                value={filters.searchName}
                                                onChange={(e) => handleFilterChange('searchName', e.target.value)}
                                                placeholder="Imię, nazwisko lub email"
                                            />
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="sortBy">Sortuj po</Label>
                                            <Select value={filters.sortBy || 'none'} onValueChange={(value) => handleFilterChange('sortBy', value === 'none' ? '' : value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Bez sortowania" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sortOptions.map(option => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="sortOrder">Kierunek sortowania</Label>
                                            <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sortOrderOptions.map(option => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button onClick={applyFilters} className="bg-blue-600 hover:bg-blue-700">
                                            Zastosuj filtry
                                        </Button>
                                        <Button onClick={clearFilters} variant="outline">
                                            Wyczyść filtry
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-sm text-gray-600">
                                    {requests.length} z {totalRequests} żądań (Strona {currentPage} z {totalPages})
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">Wyników na stronie:</span>
                                    <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                            <SelectItem value="100">100</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            {requests.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Brak żądań do wyświetlenia
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ID</TableHead>
                                                <TableHead>Użytkownik</TableHead>
                                                <TableHead>Manager</TableHead>
                                                <TableHead>Kwota</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Opis</TableHead>
                                                <TableHead>Powód</TableHead>
                                                <TableHead>Data utworzenia</TableHead>
                                                <TableHead>Data aktualizacji</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {requests.map((request) => (
                                                <TableRow key={request.id}>
                                                    <TableCell className="font-medium">
                                                        {request.id}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            <div className="font-medium">{request.userName}</div>
                                                            <div className="text-gray-500">{request.userEmail}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            {request.managerName}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {formatCurrency(request.amountPln)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(request.status)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-xs truncate" title={request.description}>
                                                            {request.description}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-xs truncate" title={request.reason}>
                                                            {request.reason}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatDate(request.createdAt)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {request.updatedAt ? formatDate(request.updatedAt) : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                            
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
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}