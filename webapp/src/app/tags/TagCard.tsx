'use client'
import {Card, CardBody, CardFooter, CardHeader} from "@heroui/card";
import Link from "next/link";
import {Tag} from "@/lib/types";
import {JSX} from "react";
import {Chip} from "@heroui/chip";

type Props = {
    tag: Tag
}

export default function TagCard({tag}: Props): JSX.Element {
    return (
        <Card
            as={Link}
            href={`/questions?tag=${tag.slug}`}
            isHoverable={true}
            isPressable
        >
            <CardHeader>
                <Chip variant={"bordered"}>{tag.slug}</Chip>
            </CardHeader>
            <CardBody>
                <p className="line-clamp-3">{tag.description}</p>
            </CardBody>
            <CardFooter>42 Questions</CardFooter>
        </Card>
    );
}