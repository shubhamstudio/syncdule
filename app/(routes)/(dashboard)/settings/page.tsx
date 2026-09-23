"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserProfile, useUser } from "@clerk/nextjs"
import { Layers, User } from "lucide-react"
import ChannelsTab from "@/components/settings/channels-tab"
import { PageHeader } from "@/components/workspace-ui"

const SettingsPage = () => {
  const { user } = useUser()
  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto w-full h-full">
        <PageHeader eyebrow="Workspace controls" title="Settings" description="Manage your identity and connected social handles." />

        <div>
          <Tabs defaultValue="channels">
            <div className="mb-6 w-full border-b border-white/10">
              <TabsList variant="line" className="w-fit space-x-4
              group-data-horizontal/tabs:h-12
              ">
                <TabsTrigger value="profile">
                  <User className="size-4" />
                  Profile</TabsTrigger>
                <TabsTrigger value="channels">
                  <Layers className="size-4" />
                  Handles</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Your Profile
                  </CardTitle>
                  <CardDescription>Manage your account information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {user?.imageUrl ? (
                      <Image
                        src={user.imageUrl}
                        alt="Profile"
                        className="h-16 w-16 rounded-full"
                        width={64}
                        height={64}
                      />
                    ):(
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <User className="size-8 text-muted-foreground" />
                      </div>
                    )}

                    <div>
                      <p className="font-medium">{user?.fullName || "No name set"}</p>
                      <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                  </div>
                   <div className="mt-6">
                    <UserProfile
                      routing="hash"
                      appearance={{
                        elements: {
                          rootBox: "w-full",
                          card: "border-0 shadow-none",
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="channels">
              <ChannelsTab  />
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
