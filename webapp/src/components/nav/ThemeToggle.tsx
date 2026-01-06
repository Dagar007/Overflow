'use client'
import {Button} from "@heroui/button";
import {useTheme} from "next-themes";
import {SunIcon, MoonIcon} from "@heroicons/react/24/solid";
import {useEffect, useEffectEvent, useState} from "react";

export default function ThemeToggle() {
    const {theme, setTheme} = useTheme();
    const[mounted, setMounted] = useState(false);

    const updateMounted = useEffectEvent((componentMounted: boolean) => {
        setMounted(componentMounted);
    });
    
    useEffect(() => {
        updateMounted(true)
    }, []);
    
    if (!mounted) return null;
    
    return (
        <Button 
            color='primary'
            variant='light'
            isIconOnly
            aria-label='Theme Toggle'
            onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
            {theme === 'light' ? (<MoonIcon className='h-8'/>) : (<SunIcon className='h-8 text-yellow-300' />)}
        </Button>
    );
}